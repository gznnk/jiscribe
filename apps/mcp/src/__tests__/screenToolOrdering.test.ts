// A tool that needs the screen is answered against every write the server had
// taken in before it: the write is waited out, and what it left in the file is on
// its way to the window ahead of the request, naming the revision to be drawn.
//
// No browser is opened: a ws client stands in for the window, and records the
// frames it was sent in the order they arrived.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

import type * as canvasStoreModule from "../canvasStore";
import { readSessionToken } from "./hostSessionToken";
import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";
import { VIEWER_STUB_HTML } from "./viewerStubHtml";
import type { CanvasHostServerMessage } from "../shared/canvasHostProtocol";

const mocked = vi.hoisted(() => ({
	/**
	 * How long each resolution of a tool's path argument is held back, taken from
	 * the front one call at a time. Empty lets every one through at once
	 */
	resolveDelaysMs: [] as number[],
}));

// Holding the resolution back is what keeps a write in the air while the screen
// tool sent after it arrives
vi.mock("../canvasStore", async (importActual) => {
	const actual = await importActual<typeof canvasStoreModule>();
	return {
		...actual,
		toCanvasFilePath: async (path: string) => {
			const delayMs = mocked.resolveDelaysMs.shift() ?? 0;
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			return await actual.toCanvasFilePath(path);
		},
	};
});

/** Long enough that the write would land well after a screen tool not waiting on it */
const WRITE_DELAY_MS = 400;

let client: McpTestClient;
let viewerRoot: string;
let workspace: TempCanvasWorkspace;
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
	client = await connectMcpTestClient();
});

beforeEach(async () => {
	workspace = await createTempCanvasWorkspace();
});

afterEach(async () => {
	mocked.resolveDelaysMs = [];
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	await client.callTool("close_canvas", {});
	await workspace.remove();
});

afterAll(async () => {
	await client.close();
	for (const [name, value] of Object.entries(previousEnv)) {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	}
	await rm(viewerRoot, { recursive: true, force: true });
});

/** A ws client in place of the window, answering every request at once */
type FakeViewer = {
	/** Every frame the host sent, in the order it arrived */
	receivedFrames: CanvasHostServerMessage[];
};

/**
 * Opens the file through open_canvas and connects in place of its window, which
 * answers each handleOpRequest straight away.
 *
 * @param filePath The canvas file to open (absolute path)
 * @returns The window, once the file has been opened in it
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
	const viewer: FakeViewer = { receivedFrames: [] };
	socket.on("message", (data) => {
		const frame = JSON.parse(String(data)) as CanvasHostServerMessage;
		viewer.receivedFrames.push(frame);
		if (frame.type === "handleOpRequest") {
			socket.send(
				JSON.stringify({
					type: "handleOpResult",
					requestId: frame.requestId,
					ok: true,
					text: "answered",
				}),
			);
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	await expect
		.poll(() => viewer.receivedFrames.some(({ type }) => type === "openCanvas"))
		.toBe(true);
	return viewer;
};

/**
 * The document text the window held when the screen tool's request reached it,
 * and the revision the request named.
 *
 * @param viewer The window asked
 */
const readStateAtRequest = (
	viewer: FakeViewer,
): { docText: string; docRevision: string; expectedRevision: unknown } => {
	const requestIndex = viewer.receivedFrames.findIndex(
		({ type }) => type === "handleOpRequest",
	);
	const request = viewer.receivedFrames[requestIndex];
	if (request?.type !== "handleOpRequest") {
		throw new Error("the window was never asked");
	}
	const lastDocFrame = viewer.receivedFrames
		.slice(0, requestIndex)
		.reverse()
		.find(({ type }) => type === "openCanvas" || type === "docChanged");
	if (
		lastDocFrame?.type !== "openCanvas" &&
		lastDocFrame?.type !== "docChanged"
	) {
		throw new Error("the window had no document when it was asked");
	}
	return {
		docText: lastDocFrame.docText,
		docRevision: lastDocFrame.revision,
		expectedRevision: request.expectedRevision,
	};
};

describe("a screen tool", () => {
	it("is sent to the window only after a write that arrived alongside it, ahead of it, has landed", async () => {
		const filePath = await workspace.writeDoc("drawing.jis.json", {
			version: 1,
			root: [],
		});
		const viewer = await openInFakeViewer(filePath);
		mocked.resolveDelaysMs = [WRITE_DELAY_MS];

		const [added, viewed] = await Promise.all([
			client.callTool("add_rect", {
				path: filePath,
				x: 0,
				y: 0,
				text: "sent alongside",
			}),
			client.callTool("get_view", {}),
		]);

		expect(added.text).not.toContain("error:");
		expect(viewed.text).toBe("answered");
		const state = readStateAtRequest(viewer);
		expect(state.docText).toContain("sent alongside");
		expect(state.expectedRevision).toBe(state.docRevision);
	});

	it("gets a write made just before it to the window without waiting for the watch", async () => {
		const filePath = await workspace.writeDoc("drawing.jis.json", {
			version: 1,
			root: [],
		});
		const viewer = await openInFakeViewer(filePath);

		await client.callTool("add_rect", {
			path: filePath,
			x: 0,
			y: 0,
			text: "written first",
		});
		await client.callTool("get_view", {});

		const state = readStateAtRequest(viewer);
		expect(state.docText).toContain("written first");
		expect(state.expectedRevision).toBe(state.docRevision);
	});

	it("is not held up by a write that arrived after it", async () => {
		const filePath = await workspace.writeDoc("drawing.jis.json", {
			version: 1,
			root: [],
		});
		const viewer = await openInFakeViewer(filePath);
		mocked.resolveDelaysMs = [WRITE_DELAY_MS * 5];

		const viewing = client.callTool("get_view", {});
		const adding = client.callTool("add_rect", {
			path: filePath,
			x: 0,
			y: 0,
			text: "sent behind",
		});
		let isAdded = false;
		void adding.then(() => {
			isAdded = true;
		});

		expect((await viewing).text).toBe("answered");
		expect(isAdded).toBe(false);
		expect(readStateAtRequest(viewer).docText).not.toContain("sent behind");
		await adding;
	});
});
