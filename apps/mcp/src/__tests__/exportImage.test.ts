// export_image writes what the viewer drew to a file the AI names, so the output
// is held to the directory on display, and the viewer is asked only once the
// output has passed. No browser is opened: a ws client stands in for the window
// and answers with bytes of its own.

import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rename,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import WebSocket from "ws";

import { readSessionToken } from "./hostSession";
import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";
import { VIEWER_STUB_HTML } from "./viewerStubHtml";
import { createJiscribeMcpRuntime, type JiscribeMcpRuntime } from "../runtime";
import type {
	CanvasHostServerMessage,
	ViewerOp,
} from "../shared/canvasHostProtocol";

/** The bytes the stand-in window answers every export with */
const EXPORTED_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

/** The text it answers a PNG export with */
const PNG_ANSWER_TEXT = "240 x 160 px (scale 2) of the whole drawing";

/** A handleOpResult's fields past its type and requestId */
type ViewerAnswer = {
	ok: boolean;
	text: string;
	exportedImageBase64?: string;
};

/** What the stand-in window answers every export with, unless a test says otherwise */
const DEFAULT_ANSWER: ViewerAnswer = {
	ok: true,
	text: PNG_ANSWER_TEXT,
	exportedImageBase64: EXPORTED_BYTES.toString("base64"),
};

/**
 * Builds the window's answer, run once the request has arrived and before the
 * answer goes out (which is where a test changes the disk under the call)
 */
let calcAnswer: () => Promise<ViewerAnswer> = async () => DEFAULT_ANSWER;

/** Held by the test so it can reach the host the server's tools act through */
let runtime: JiscribeMcpRuntime;
let client: McpTestClient;
let viewerRoot: string;
let workspace: TempCanvasWorkspace;
/** A directory beside the workspace, for the outputs that must not land there */
let outsideDir: string;
const openSockets: WebSocket[] = [];
const previousEnv: Record<string, string | undefined> = {};

beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), VIEWER_STUB_HTML, "utf8");
	for (const name of ["JISCRIBE_MCP_VIEWER_ROOT", "JISCRIBE_MCP_NO_OPEN"]) {
		previousEnv[name] = process.env[name];
	}
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	process.env.JISCRIBE_MCP_NO_OPEN = "1";
	runtime = createJiscribeMcpRuntime();
	client = await connectMcpTestClient({ runtime });
});

beforeEach(async () => {
	workspace = await createTempCanvasWorkspace();
	outsideDir = await mkdtemp(join(tmpdir(), "jiscribe-mcp-outside-"));
});

afterEach(async () => {
	calcAnswer = async () => DEFAULT_ANSWER;
	vi.restoreAllMocks();
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	await client.callTool("close_canvas", {});
	await workspace.remove();
	await rm(outsideDir, { recursive: true, force: true });
});

afterAll(async () => {
	await client.close();
	await runtime.close();
	for (const [name, value] of Object.entries(previousEnv)) {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	}
	await rm(viewerRoot, { recursive: true, force: true });
});

/** A ws client in place of the window, answering every export with calcAnswer's answer */
type FakeViewer = {
	/** The ops of the requests it was sent, in the order they arrived */
	requestedOps: ViewerOp[];
};

/**
 * Opens the file through open_canvas and connects in place of its window.
 *
 * @param filePath The canvas file to open (absolute path, which may run through a link)
 */
const openInFakeViewer = async (filePath: string): Promise<FakeViewer> => {
	const opened = await client.callTool("open_canvas", { path: filePath });
	const viewerUrl = /viewer: (\S+)$/.exec(opened.text)?.[1];
	if (viewerUrl === undefined) {
		throw new Error(`no viewer URL in the reply: ${opened.text}`);
	}
	const socket = new WebSocket(
		`${viewerUrl.replace("http", "ws")}/ws?token=${await readSessionToken(viewerUrl)}`,
	);
	openSockets.push(socket);
	const viewer: FakeViewer = { requestedOps: [] };
	let hasDoc = false;
	socket.on("message", (data) => {
		const frame = JSON.parse(String(data)) as CanvasHostServerMessage;
		if (frame.type === "openCanvas") {
			hasDoc = true;
		}
		if (frame.type !== "handleOpRequest") {
			return;
		}
		viewer.requestedOps.push(frame.op);
		void calcAnswer().then((answer) => {
			socket.send(
				JSON.stringify({
					type: "handleOpResult",
					requestId: frame.requestId,
					...answer,
				}),
			);
		});
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	await expect.poll(() => hasDoc).toBe(true);
	return viewer;
};

/** Writes an empty canvas into the workspace and opens it in a stand-in window */
const openEmptyCanvas = async (): Promise<FakeViewer> =>
	await openInFakeViewer(
		await workspace.writeDoc("drawing.jis.json", { version: 1, root: [] }),
	);

describe("export_image", () => {
	it("says to call open_canvas when no canvas is open", async () => {
		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.png"),
		});

		expect(result.text).toMatch(/^error: no canvas is open/);
		expect(result.text).toContain("open_canvas");
		expect(result.text).toContain("headless: true");
	});

	it("writes the PNG the viewer drew, at scale 2 when none is given, and says what it is", async () => {
		const viewer = await openEmptyCanvas();
		const outputPath = join(workspace.dirPath, "out.png");

		const result = await client.callTool("export_image", {
			output: outputPath,
		});

		expect(result.text).toBe(`wrote ${outputPath}: ${PNG_ANSWER_TEXT}`);
		expect(await readFile(outputPath)).toEqual(EXPORTED_BYTES);
		expect(viewer.requestedOps).toEqual([
			{ kind: "exportImage", format: "png", scale: 2 },
		]);
	});

	it("writes an SVG with its byte count, passing ids and isolate on", async () => {
		const viewer = await openEmptyCanvas();
		const outputPath = join(workspace.dirPath, "out.SVG");

		const result = await client.callTool("export_image", {
			output: outputPath,
			ids: ["r1"],
			isolate: true,
		});

		expect(result.text).toBe(
			`wrote ${outputPath} (SVG, ${EXPORTED_BYTES.length} bytes)`,
		);
		expect(await readFile(outputPath)).toEqual(EXPORTED_BYTES);
		expect(viewer.requestedOps).toEqual([
			{ kind: "exportImage", format: "svg", ids: ["r1"], isolate: true },
		]);
	});

	it("gives the viewer 60 s to answer, not the 15 s of a screen tool", async () => {
		await openEmptyCanvas();
		const host = runtime.getHost();
		if (host === null) {
			throw new Error("open_canvas left no host");
		}
		const runHandleOp = vi.spyOn(host, "runHandleOp");

		await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.png"),
		});

		expect(runHandleOp).toHaveBeenCalledWith(
			expect.objectContaining({ kind: "exportImage" }),
			60_000,
		);
	});

	it("writes nothing when the viewer answers without the image", async () => {
		await openEmptyCanvas();
		calcAnswer = async () => ({ ok: true, text: "answered" });

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.png"),
		});

		expect(result.text).toMatch(
			/^error: the canvas viewer answered without an image/,
		);
		expect(await readdir(workspace.dirPath)).toEqual(["drawing.jis.json"]);
	});

	it("checks the output again once the viewer has drawn, refusing a directory turned into a link out meanwhile", async () => {
		await openEmptyCanvas();
		const subDir = join(workspace.dirPath, "sub");
		await mkdir(subDir);
		calcAnswer = async () => {
			await rename(subDir, join(workspace.dirPath, "sub-moved"));
			await symlink(outsideDir, subDir);
			return DEFAULT_ANSWER;
		};

		const result = await client.callTool("export_image", {
			output: join(subDir, "out.png"),
		});

		expect(result.text).toMatch(/^error: .* is not under /);
		expect(await readdir(outsideDir)).toEqual([]);
	});

	it("refuses a plain .png name that leads to a .jis.png", async () => {
		const viewer = await openEmptyCanvas();
		const diagramPath = join(workspace.dirPath, "diagram.jis.png");
		await writeFile(diagramPath, "an editable diagram");
		await symlink(diagramPath, join(workspace.dirPath, "plain.png"));

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "plain.png"),
		});

		expect(result.text).toMatch(/^error: .* leads to an editable diagram/);
		expect(viewer.requestedOps).toEqual([]);
		expect(await readFile(diagramPath, "utf8")).toBe("an editable diagram");
	});

	it("replaces an image already at the output", async () => {
		await openEmptyCanvas();
		const outputPath = join(workspace.dirPath, "out.png");
		await writeFile(outputPath, "an older export");

		const result = await client.callTool("export_image", {
			output: outputPath,
		});

		expect(result.text).toMatch(/^wrote /);
		expect(await readFile(outputPath)).toEqual(EXPORTED_BYTES);
	});

	it("writes beside a .jis opened through a linked directory, named through the link", async () => {
		await workspace.writeDoc("drawing.jis.json", { version: 1, root: [] });
		const linkedDir = join(outsideDir, "linked");
		await symlink(workspace.dirPath, linkedDir);
		await openInFakeViewer(join(linkedDir, "drawing.jis.json"));

		const result = await client.callTool("export_image", {
			output: join(linkedDir, "out.png"),
		});

		expect(result.text).toMatch(/^wrote /);
		expect(await readFile(join(workspace.dirPath, "out.png"))).toEqual(
			EXPORTED_BYTES,
		);
	});

	it.each([
		["a .jpg", "out.jpg", /has to end in \.png or \.svg/],
		["a .jis.png", "drawing.jis.png", /editable diagram.*plain \.png/],
		["a .JIS.SVG", "drawing.JIS.SVG", /editable diagram.*plain \.svg/],
	])(
		"refuses %s before asking the viewer",
		async (_label, fileName, expected) => {
			const viewer = await openEmptyCanvas();

			const result = await client.callTool("export_image", {
				output: join(workspace.dirPath, fileName),
			});

			expect(result.text).toMatch(/^error: /);
			expect(result.text).toMatch(expected);
			expect(viewer.requestedOps).toEqual([]);
			expect(await readdir(workspace.dirPath)).toEqual(["drawing.jis.json"]);
		},
	);

	it("refuses scale on an SVG", async () => {
		const viewer = await openEmptyCanvas();

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.svg"),
			scale: 2,
		});

		expect(result.text).toBe(
			"error: scale is for a PNG only; drop it for an .svg",
		);
		expect(viewer.requestedOps).toEqual([]);
	});

	it("refuses isolate without ids", async () => {
		const viewer = await openEmptyCanvas();

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.png"),
			isolate: true,
		});

		expect(result.text).toMatch(/^error: isolate works with ids only/);
		expect(viewer.requestedOps).toEqual([]);
	});

	it("refuses a scale above 8 at the schema", async () => {
		await openEmptyCanvas();

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "out.png"),
			scale: 9,
		});

		expect(result.isError).toBe(true);
	});

	describe("refuses an output outside the directory on display", () => {
		it("in another directory", async () => {
			const viewer = await openEmptyCanvas();

			const result = await client.callTool("export_image", {
				output: join(outsideDir, "out.png"),
			});

			expect(result.text).toMatch(/^error: .* is not under /);
			expect(viewer.requestedOps).toEqual([]);
			expect(await readdir(outsideDir)).toEqual([]);
		});

		it("through ..", async () => {
			await openEmptyCanvas();

			const result = await client.callTool("export_image", {
				// Written out by hand: join would fold the .. away before the tool saw it
				output: `${workspace.dirPath}/../${basename(outsideDir)}/out.png`,
			});

			expect(result.text).toMatch(/^error: .* is not under /);
			expect(await readdir(outsideDir)).toEqual([]);
		});

		it("through a linked directory inside it that leads out", async () => {
			const viewer = await openEmptyCanvas();
			await symlink(outsideDir, join(workspace.dirPath, "escape"));

			const result = await client.callTool("export_image", {
				output: join(workspace.dirPath, "escape", "out.png"),
			});

			expect(result.text).toMatch(/^error: .* is not under /);
			expect(viewer.requestedOps).toEqual([]);
			expect(await readdir(outsideDir)).toEqual([]);
		});

		it("through a linked file inside it that leads out", async () => {
			await openEmptyCanvas();
			const outsideFile = join(outsideDir, "target.png");
			await writeFile(outsideFile, "left alone");
			await symlink(outsideFile, join(workspace.dirPath, "out.png"));

			const result = await client.callTool("export_image", {
				output: join(workspace.dirPath, "out.png"),
			});

			expect(result.text).toMatch(/^error: .* is not under /);
			expect(await readFile(outsideFile, "utf8")).toBe("left alone");
		});
	});

	it("refuses an output whose directory does not exist, and creates none", async () => {
		const viewer = await openEmptyCanvas();

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "missing", "out.png"),
		});

		expect(result.text).toMatch(/^error: .*missing does not exist/);
		expect(viewer.requestedOps).toEqual([]);
		expect(await readdir(workspace.dirPath)).toEqual(["drawing.jis.json"]);
	});

	it("refuses an output that is a directory", async () => {
		await openEmptyCanvas();
		await mkdir(join(workspace.dirPath, "folder.png"));

		const result = await client.callTool("export_image", {
			output: join(workspace.dirPath, "folder.png"),
		});

		expect(result.text).toMatch(/^error: .* is a directory/);
	});
});
