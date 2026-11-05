import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TextSlotMeasurement } from "@jiscribe/canvas";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import WebSocket from "ws";

import type * as canvasStoreModule from "../canvasStore";
import { readSessionToken } from "./hostSession";
import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";
import { VIEWER_STUB_HTML } from "./viewerStubHtml";
import type {
	CanvasHostClientMessage,
	CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";

const mocked = vi.hoisted(() => ({
	/**
	 * Appended to the text diagnose_canvas reads, so what it diagnoses differs
	 * from what the host sent the window (whose reads do not go through
	 * canvasStore). Empty leaves the read as it is
	 */
	diagnosedTextSuffix: "",
}));

vi.mock("../canvasStore", async (importActual) => {
	const actual = await importActual<typeof canvasStoreModule>();
	return {
		...actual,
		readCanvasFileText: async (path: string) =>
			(await actual.readCanvasFileText(path)) + mocked.diagnosedTextSuffix,
	};
});

const fittingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "roomy",
			type: "rect",
			x: 0,
			y: 0,
			width: 240,
			height: 120,
			text: "収まる文",
			fontSize: 13,
		},
	],
};

const overflowingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "narrow",
			type: "rect",
			x: 0,
			y: 0,
			width: 60,
			height: 40,
			text: "とても長い説明文をわざと狭い矩形に押し込んで、はみ出しが検出されることを確かめる",
			fontSize: 13,
		},
	],
};

/**
 * A connector whose label is wider than the gap between the two shapes
 * (doc-tools' labelOverflowing).
 */
const labelOverflowingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "s2",
			type: "rect",
			x: 448,
			y: 264,
			width: 264,
			height: 88,
			text: "② マイクロタスクを\nすべて処理 — 出力: B",
			fontSize: 16,
		},
		{
			id: "s3",
			type: "rect",
			x: 832,
			y: 264,
			width: 264,
			height: 88,
			text: "③ タスクを 1 つ処理\n出力: C",
			fontSize: 16,
		},
		{
			id: "o2",
			type: "connector",
			points: [],
			source: {
				owner: { id: "s2" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { id: "s3" },
				anchor: { kind: "connectPoint", id: "leftCenter" },
			},
			label: { text: "マイクロタスクが尽きる", fontSize: 13 },
		},
	],
};

/** One image, named relative to the diagram's directory. */
const imageDoc = (src: string): CanvasFileContent => ({
	version: 1,
	root: [
		{ id: "photo", type: "image", x: 0, y: 0, width: 80, height: 60, src },
	],
});

let client: McpTestClient;
let workspace: TempCanvasWorkspace;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

describe("diagnose_canvas", () => {
	it("reports nothing for a document that fits", async () => {
		const path = await workspace.writeDoc("fitting.jis.json", fittingDoc);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toBe("valid: true");
	});

	it("lists an overflowing shape as a single error", async () => {
		const path = await workspace.writeDoc(
			"overflowing.jis.json",
			overflowingDoc,
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n1 issue\(s\):\n/);
		expect(result.text).toContain("- error narrow: text overflows rect 60x40");
	});

	it("lists an overflowing connector label while staying valid: true, it being a warning", async () => {
		const path = await workspace.writeDoc(
			"labelOverflowing.jis.json",
			labelOverflowingDoc,
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: true\n1 issue\(s\):\n/);
		expect(result.text).toContain(
			'- warning o2: label "マイクロタスクが尽きる" is 142.5px wide but only 120px is free between s2 and s3',
		);
	});

	it("returns valid: false and names the field for a document that will not open", async () => {
		const path = await workspace.writeDoc("incomplete.jis.json", {
			version: 1,
			root: [{ id: "r", type: "rect", x: 0, y: 0 }],
		});
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n/);
		expect(result.text).toContain("- error root[0].width: must be a number");
	});

	it("returns a syntax error when the file is broken as JSON", async () => {
		const path = await workspace.writeText("broken.jis.json", "{");
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n/);
		expect(result.text).toContain("JSON syntax error");
	});

	it("reports an image whose file is not beside the diagram", async () => {
		const path = await workspace.writeDoc(
			"missingImage.jis.json",
			imageDoc("images/missing.png"),
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n1 issue\(s\):\n/);
		expect(result.text).toContain(
			'- error photo: src "images/missing.png" names a file that does not exist, so the canvas draws a placeholder box in its place',
		);
	});

	it("reports nothing for an image whose file is in place", async () => {
		await mkdir(join(workspace.dirPath, "images"), { recursive: true });
		await writeFile(join(workspace.dirPath, "images", "present.png"), "");
		const path = await workspace.writeDoc(
			"presentImage.jis.json",
			imageDoc("images/present.png"),
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toBe("valid: true");
	});

	it("returns a file it cannot read as error text, not as an exception", async () => {
		// A directory named like a canvas: something is there, but it cannot be read
		const directoryPath = join(workspace.dirPath, "directory.jis.json");
		await mkdir(directoryPath);
		const result = await client.callTool("diagnose_canvas", {
			path: directoryPath,
		});
		expect(result.isError).toBe(false);
		expect(result.text).toContain("error: failed to read file:");
	});
});

/** A markdown card holding text, as listSourceTextObjects picks it */
const markdownCard = (id: string, x: number): Record<string, unknown> => ({
	id,
	type: "markdown",
	x,
	y: 0,
	width: 200,
	height: 80,
	text: "# 見出し\n\n本文",
});

const markdownDoc: CanvasFileContent = {
	version: 1,
	root: [markdownCard("md-1", 0)],
};

/** A measurement of a 200x80 card's body whose drawn height is `textHeight` */
const measurementOf = (textHeight: number): TextSlotMeasurement => ({
	textSlotId: "body",
	bounds: { x: 0, y: 0, width: 200, height: 80 },
	textSize: { width: 188, height: textHeight },
	regionSize: { width: 188, height: 76 },
	lineCount: null,
	isOverflowing: textHeight > 76,
});

/** What the stand-in window answers a handleOpRequest with, requestId aside */
type FakeAnswer = Omit<
	Extract<CanvasHostClientMessage, { type: "handleOpResult" }>,
	"type" | "requestId"
>;

describe("diagnose_canvas measuring markdown on the viewer", () => {
	let viewerRoot: string;
	const previousEnv: Record<string, string | undefined> = {};
	const openSockets: WebSocket[] = [];

	beforeAll(async () => {
		viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
		await writeFile(join(viewerRoot, "index.html"), VIEWER_STUB_HTML, "utf8");
		for (const name of ["JISCRIBE_MCP_VIEWER_ROOT", "JISCRIBE_MCP_NO_OPEN"]) {
			previousEnv[name] = process.env[name];
		}
		process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
		process.env.JISCRIBE_MCP_NO_OPEN = "1";
	});

	afterEach(async () => {
		mocked.diagnosedTextSuffix = "";
		for (const socket of openSockets.splice(0)) {
			socket.close();
		}
		await client.callTool("close_canvas", {});
	});

	afterAll(async () => {
		for (const [name, value] of Object.entries(previousEnv)) {
			if (value === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = value;
			}
		}
		await rm(viewerRoot, { recursive: true, force: true });
	});

	/**
	 * Opens the file through open_canvas and connects a ws client in place of its
	 * window, answering each handleOpRequest with what `answer` returns for its op.
	 *
	 * @param filePath The canvas file to put on display (absolute path)
	 * @param answer What the window answers; the measured ids are recorded either way
	 * @returns The ids measureText was asked for, in the order asked
	 */
	const openInFakeViewer = async (
		filePath: string,
		answer: (objectId: string) => FakeAnswer,
	): Promise<string[]> => {
		const opened = await client.callTool("open_canvas", { path: filePath });
		const viewerUrl = /viewer: (\S+)$/.exec(opened.text)?.[1];
		if (viewerUrl === undefined) {
			throw new Error(`no viewer URL in the reply: ${opened.text}`);
		}
		const socket = new WebSocket(
			`${viewerUrl.replace("http", "ws")}/ws?token=${await readSessionToken(viewerUrl)}`,
		);
		openSockets.push(socket);
		const askedIds: string[] = [];
		let hasOpened = false;
		socket.on("message", (data) => {
			const frame = JSON.parse(String(data)) as CanvasHostServerMessage;
			if (frame.type === "openCanvas") {
				hasOpened = true;
			}
			if (frame.type !== "handleOpRequest" || frame.op.kind !== "measureText") {
				return;
			}
			askedIds.push(frame.op.id);
			socket.send(
				JSON.stringify({
					type: "handleOpResult",
					requestId: frame.requestId,
					...answer(frame.op.id),
				}),
			);
		});
		await new Promise<void>((resolve, reject) => {
			socket.once("open", resolve);
			socket.once("error", reject);
		});
		await expect.poll(() => hasOpened).toBe(true);
		return askedIds;
	};

	const measuredAnswer = (textHeight: number): FakeAnswer => ({
		ok: true,
		text: "measured",
		textMeasurement: measurementOf(textHeight),
	});

	it("reports a body the viewer measured as overflowing as an error on the object", async () => {
		const path = await workspace.writeDoc("md-over.jis.json", markdownDoc);
		await openInFakeViewer(path, () => measuredAnswer(132.5));
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n1 issue\(s\):\n/);
		expect(result.text).toContain(
			"- error md-1: text overflows markdown 200x80: the rendered body needs 132.5px of height but the region is 76px tall (measured as drawn on the open canvas)",
		);
		expect(result.text).not.toContain("not checked");
	});

	it("measures on the viewer when the workspace is reached through a link", async () => {
		const linkParent = await mkdtemp(join(tmpdir(), "jiscribe-mcp-link-"));
		try {
			const linkedDir = join(linkParent, "linked");
			await symlink(workspace.dirPath, linkedDir, "dir");
			await workspace.writeDoc("md-linked.jis.json", markdownDoc);
			const linkedPath = join(linkedDir, "md-linked.jis.json");
			const askedIds = await openInFakeViewer(linkedPath, () =>
				measuredAnswer(132.5),
			);
			const result = await client.callTool("diagnose_canvas", {
				path: linkedPath,
			});
			expect(askedIds).toEqual(["md-1"]);
			expect(result.text).toContain("- error md-1: text overflows markdown");
		} finally {
			await rm(linkParent, { recursive: true, force: true });
		}
	});

	it("reports nothing for a body the viewer measured as fitting", async () => {
		const path = await workspace.writeDoc("md-fits.jis.json", markdownDoc);
		await openInFakeViewer(path, () => measuredAnswer(40));
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toBe("valid: true");
	});

	it("keeps the warning when no viewer is open", async () => {
		const path = await workspace.writeDoc("md-closed.jis.json", markdownDoc);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toContain(
			"text in markdown md-1 is not checked for overflow",
		);
	});

	it("keeps the warning, and asks nothing, when another file is on display", async () => {
		const path = await workspace.writeDoc("md-other.jis.json", markdownDoc);
		const otherPath = await workspace.writeDoc("other.jis.json", markdownDoc);
		const askedIds = await openInFakeViewer(otherPath, () =>
			measuredAnswer(132.5),
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toContain(
			"text in markdown md-1 is not checked for overflow",
		);
		expect(askedIds).toEqual([]);
	});

	it("keeps the warning when the window answers without the numbers (an old tab)", async () => {
		const path = await workspace.writeDoc("md-old-tab.jis.json", markdownDoc);
		await openInFakeViewer(path, () => ({ ok: true, text: "measured" }));
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toContain(
			"text in markdown md-1 is not checked for overflow",
		);
		expect(result.text).not.toContain("- error");
	});

	it("keeps the warning when the window drew other text than was diagnosed", async () => {
		const path = await workspace.writeDoc("md-stale.jis.json", markdownDoc);
		await openInFakeViewer(path, () => measuredAnswer(132.5));
		mocked.diagnosedTextSuffix = "\n";
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toContain(
			"text in markdown md-1 is not checked for overflow",
		);
		expect(result.text).not.toContain("- error");
	});

	it("stops asking at the first failure and leaves the rest unchecked", async () => {
		const path = await workspace.writeDoc("md-three.jis.json", {
			version: 1,
			root: [
				markdownCard("md-1", 0),
				markdownCard("md-2", 300),
				markdownCard("md-3", 600),
			],
		});
		const askedIds = await openInFakeViewer(path, (objectId) =>
			objectId === "md-1"
				? measuredAnswer(132.5)
				: { ok: false, text: "nothing to measure" },
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(askedIds).toEqual(["md-1", "md-2"]);
		expect(result.text).toContain("- error md-1: text overflows markdown");
		expect(result.text).toContain(
			"text in markdown md-2, md-3 is not checked for overflow",
		);
	});
});
