// The two seams between the host and a viewer: the file watch that mirrors an
// outside edit into the window, and the requestId round trip that asks the window
// what only a drawn canvas knows. No browser is needed for either — a ws client
// stands in for the viewer, and the file is edited from the test.

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

import { startCanvasHost, type CanvasHost } from "../host/canvasHost";
import type {
	CanvasHostClientMessage,
	CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";

/** Where the ports these tests use start; the host gives way upward if one is taken */
const TEST_PORT = 5390;

/** The file every test opens, relative to the workspace root */
const OPEN_REL_PATH = "diagram.jis.json";

/**
 * How long to leave the watch (which polls at 300ms) to pick a write up before
 * concluding it sent nothing. Only ever used for a negative assertion, which a
 * positive control right after keeps from passing vacuously
 */
const WATCH_SETTLE_MS = 900;

/** The host's own timeout for a handleOpRequest, driven with fake timers */
const HANDLE_OP_TIMEOUT_MS = 15_000;

let viewerRoot: string;
let previousViewerRoot: string | undefined;
let workspaceRoot: string;
const openHosts: CanvasHost[] = [];
const openSockets: WebSocket[] = [];

/**
 * Stands in for the built viewer. resolveViewerAssets passes as long as
 * index.html is there
 */
beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	previousViewerRoot = process.env.JISCRIBE_MCP_VIEWER_ROOT;
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
});

afterAll(async () => {
	if (previousViewerRoot === undefined) {
		delete process.env.JISCRIBE_MCP_VIEWER_ROOT;
	} else {
		process.env.JISCRIBE_MCP_VIEWER_ROOT = previousViewerRoot;
	}
	await rm(viewerRoot, { recursive: true, force: true });
});

beforeEach(async () => {
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
});

afterEach(async () => {
	// The teardown itself waits on real time, so a test that faked it hands the
	// clock back here
	vi.useRealTimers();
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	for (const host of openHosts.splice(0)) {
		await host.close();
	}
	await rm(workspaceRoot, { recursive: true, force: true });
});

/** Starts a host on the temporary workspace, with no browser put up */
const startTestHost = async (): Promise<CanvasHost> => {
	const host = await startCanvasHost({
		workspaceRoot,
		port: TEST_PORT,
		shouldOpenBrowser: false,
	});
	openHosts.push(host);
	return host;
};

/** A ws client in place of the browser the viewer runs in */
type FakeViewer = {
	socket: WebSocket;
	/** Every frame the host sent, in the order it arrived */
	receivedFrames: CanvasHostServerMessage[];
	/** Sends a frame the way the viewer's page would */
	send: (message: CanvasHostClientMessage) => void;
};

/**
 * Connects in place of a viewer and records what the host sends it.
 *
 * @param host The host to connect to
 * @param onRequest Called with every handleOpRequest, for a viewer that answers.
 *   Left out, the window stands for one that never answers
 */
const connectFakeViewer = async (
	host: CanvasHost,
	onRequest?: (requestId: string, viewer: FakeViewer) => void,
): Promise<FakeViewer> => {
	const socket = new WebSocket(`${host.url.replace("http", "ws")}/ws`);
	openSockets.push(socket);
	const viewer: FakeViewer = {
		socket,
		receivedFrames: [],
		send: (message) => {
			socket.send(JSON.stringify(message));
		},
	};
	socket.on("message", (data) => {
		const frame = JSON.parse(String(data)) as CanvasHostServerMessage;
		viewer.receivedFrames.push(frame);
		if (frame.type === "handleOpRequest") {
			onRequest?.(frame.requestId, viewer);
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	return viewer;
};

/**
 * Polls at a short interval until the condition holds. Throws if it runs out of
 * time with the condition unmet
 */
const waitFor = async (
	isSatisfied: () => boolean,
	timeoutMs = 5_000,
): Promise<void> => {
	const deadline = Date.now() + timeoutMs;
	while (!isSatisfied()) {
		if (Date.now() > deadline) {
			throw new Error("condition was not met in time");
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
};

/** The docChanged frames the viewer was sent, as their text */
const calcChangedTexts = (viewer: FakeViewer): string[] =>
	viewer.receivedFrames
		.filter((frame) => frame.type === "docChanged")
		.map((frame) => frame.docText);

/** Writes the open file the way an AI tool or another editor would */
const writeOpenFile = async (text: string): Promise<void> => {
	await writeFile(join(workspaceRoot, OPEN_REL_PATH), text, "utf8");
};

const emptyDocText = '{"version":1,"root":[]}\n';

describe("the file watch", () => {
	it("sends the file to a viewer that connects after it was opened", async () => {
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		await host.openFile(OPEN_REL_PATH);

		const viewer = await connectFakeViewer(host);

		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		expect(viewer.receivedFrames[0]).toEqual({
			type: "openCanvas",
			relPath: OPEN_REL_PATH,
			docText: emptyDocText,
		});
	});

	it("mirrors a change made from outside", async () => {
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		const rewrittenText = '{"version":1,"root":[{"type":"rect"}]}\n';

		await writeOpenFile(rewrittenText);

		await waitFor(() => calcChangedTexts(viewer).length > 0);
		expect(calcChangedTexts(viewer)).toEqual([rewrittenText]);
	});

	it("does not send back what the viewer itself saved", async () => {
		// The host would otherwise answer a person's save with the very text they
		// just wrote, and the viewer would reload over what they are editing
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host, (requestId, connected) => {
			connected.send({
				type: "handleOpResult",
				requestId,
				ok: true,
				text: "{}",
			});
		});
		await host.openFile(OPEN_REL_PATH);
		const savedText = '{"version":1,"root":[{"type":"ellipse"}]}\n';

		viewer.send({
			type: "saved",
			relPath: OPEN_REL_PATH,
			docText: savedText,
		});
		// Frames on one connection are handled in order, so an answered round trip
		// means the saved frame above has already been taken in. Without the
		// barrier the write below could be picked up while the host still believes
		// the old text
		await host.runHandleOp({ kind: "getView" });
		await writeOpenFile(savedText);
		await new Promise((resolve) => setTimeout(resolve, WATCH_SETTLE_MS));

		expect(calcChangedTexts(viewer)).toEqual([]);

		// The control: the watch is still running, so the silence above was the
		// echo being cancelled and not a watch that never fired
		const outsideText = '{"version":1,"root":[{"type":"text"}]}\n';
		await writeOpenFile(outsideText);
		await waitFor(() => calcChangedTexts(viewer).length > 0);
		expect(calcChangedTexts(viewer)).toEqual([outsideText]);
	});

	it("stops watching the file it was told to stop showing", async () => {
		await writeOpenFile(emptyDocText);
		await writeFile(
			join(workspaceRoot, "other.jis.json"),
			emptyDocText,
			"utf8",
		);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await host.openFile("other.jis.json");

		await writeOpenFile('{"version":1,"root":[{"type":"rect"}]}\n');
		await new Promise((resolve) => setTimeout(resolve, WATCH_SETTLE_MS));

		expect(calcChangedTexts(viewer)).toEqual([]);
		expect(host.getOpenPath()).toBe("other.jis.json");
	});

	it("tells the viewer why a file it cannot read stays blank", async () => {
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);

		await host.openFile("missing.jis.json");

		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "docError"),
		);
	});
});

describe("runHandleOp", () => {
	it("carries the answer back under the requestId it asked with", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, (requestId, viewer) => {
			viewer.send({
				type: "handleOpResult",
				requestId,
				ok: true,
				text: '{"zoom":1}',
			});
		});

		expect(await host.runHandleOp({ kind: "getView" })).toEqual({
			ok: true,
			text: '{"zoom":1}',
		});
	});

	it("carries a capture's image through", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, (requestId, viewer) => {
			viewer.send({
				type: "handleOpResult",
				requestId,
				ok: true,
				text: "captured",
				imagePngBase64: "iVBORw0KGgo=",
			});
		});

		expect(await host.runHandleOp({ kind: "captureCanvas" })).toEqual({
			ok: true,
			text: "captured",
			imagePngBase64: "iVBORw0KGgo=",
		});
	});

	it("ignores an answer to a requestId nobody is waiting on", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, (requestId, viewer) => {
			// A stale tab answering an earlier session's request must not settle
			// this one
			viewer.send({
				type: "handleOpResult",
				requestId: "a-request-that-was-never-made",
				ok: true,
				text: "stale",
			});
			viewer.send({
				type: "handleOpResult",
				requestId,
				ok: true,
				text: "fresh",
			});
		});

		expect(await host.runHandleOp({ kind: "getView" })).toEqual({
			ok: true,
			text: "fresh",
		});
	});

	it("is not held up by a window that never answers", async () => {
		// Every open tab is asked, because the one that answers is not necessarily
		// the one a person is looking at: a tab left over from an earlier session
		// reconnects on its own and may be too old to know the request at all
		const host = await startTestHost();
		const staleViewer = await connectFakeViewer(host);
		await connectFakeViewer(host, (requestId, viewer) => {
			viewer.send({
				type: "handleOpResult",
				requestId,
				ok: true,
				text: "answered",
			});
		});

		expect(await host.runHandleOp({ kind: "getView" })).toEqual({
			ok: true,
			text: "answered",
		});
		// The silent one was asked too; it simply had nothing to say
		expect(
			staleViewer.receivedFrames.filter(
				(frame) => frame.type === "handleOpRequest",
			),
		).toHaveLength(1);
	});

	it("fails without asking anyone when no viewer is connected", async () => {
		const host = await startTestHost();

		const outcome = await host.runHandleOp({ kind: "getView" });

		expect(outcome.ok).toBe(false);
		expect(outcome.text).toContain("open_canvas");
	});

	it("gives up on a window that never answers", async () => {
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await waitFor(() => host.hasVisibleViewer());

		vi.useFakeTimers();
		const running = host.runHandleOp({ kind: "getView" });
		await vi.advanceTimersByTimeAsync(HANDLE_OP_TIMEOUT_MS);
		const outcome = await running;
		vi.useRealTimers();

		expect(outcome).toEqual({
			ok: false,
			text: "the canvas viewer did not answer in time",
		});
		// The request did go out; it is the answer that never came
		expect(
			viewer.receivedFrames.filter((frame) => frame.type === "handleOpRequest"),
		).toHaveLength(1);
	});

	it("settles once every window asked has gone", async () => {
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);

		const running = host.runHandleOp({ kind: "getView" });
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "handleOpRequest"),
		);
		viewer.socket.close();

		expect(await running).toEqual({
			ok: false,
			text: "the canvas viewer was closed before it could answer",
		});
	});

	it("settles everything still waiting when the host is shut down", async () => {
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);

		const running = [
			host.runHandleOp({ kind: "getView" }),
			host.runHandleOp({ kind: "getSelection" }),
		];
		await waitFor(
			() =>
				viewer.receivedFrames.filter(
					(frame) => frame.type === "handleOpRequest",
				).length === 2,
		);
		await host.close();

		expect(await Promise.all(running)).toEqual([
			{
				ok: false,
				text: "the canvas host was shut down before the viewer answered",
			},
			{
				ok: false,
				text: "the canvas host was shut down before the viewer answered",
			},
		]);
	});
});
