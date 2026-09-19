// The three seams between the host and a viewer: the file watch that mirrors an
// outside edit into the window, the write a person's save comes back through, and
// the requestId round trip that asks the window what only a drawn canvas knows. No
// browser is needed for any of them — a ws client stands in for the viewer, the
// save goes out as the PUT the viewer makes, and the file is edited from the test.

import {
	chmod,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import type * as fsPromises from "node:fs/promises";
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

import { readSessionToken } from "./hostSessionToken";
import { startCanvasHost, type CanvasHost } from "../host/canvasHost";
import { createPathLock } from "../pathLock";
import type {
	CanvasHostClientMessage,
	CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";
import { REVISION_HEADER, SESSION_TOKEN_HEADER } from "../shared/fileApiRoute";

/**
 * Reads whose file name is in here wait on the promise before they are answered,
 * which is how two openFile calls are made to overlap. Anything else is read as
 * usual
 */
const { heldReads, outsideWrite } = vi.hoisted(() => ({
	heldReads: new Map<string, Promise<void>>(),
	/**
	 * A write made to the file named, bypassing the host's lock, at the first stat
	 * of it after it has been read. That lands it after a save has compared the
	 * revision and before the save's rename, which is the gap no lock of ours
	 * covers
	 */
	outsideWrite: {
		fileName: null as string | null,
		text: "",
		hasBeenRead: false,
	},
}));

/** Notes that the file behind a path has been read, for outsideWrite */
const noteRead = (file: unknown): void => {
	if (typeof file === "string" && basename(file) === outsideWrite.fileName) {
		outsideWrite.hasBeenRead = true;
	}
};

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof fsPromises>();
	return {
		...actual,
		readFile: async (
			file: Parameters<typeof actual.readFile>[0],
			options?: Parameters<typeof actual.readFile>[1],
		) => {
			const hold =
				typeof file === "string" ? heldReads.get(basename(file)) : undefined;
			if (hold !== undefined) {
				await hold;
			}
			noteRead(file);
			return await actual.readFile(file, options);
		},
		open: async (...args: Parameters<typeof actual.open>) => {
			noteRead(args[0]);
			return await actual.open(...args);
		},
		stat: (async (...args: Parameters<typeof actual.stat>) => {
			const file = args[0];
			if (
				typeof file === "string" &&
				basename(file) === outsideWrite.fileName &&
				outsideWrite.hasBeenRead
			) {
				outsideWrite.fileName = null;
				await actual.writeFile(file, outsideWrite.text, "utf8");
			}
			return await actual.stat(...args);
		}) as typeof actual.stat,
	};
});

/** Where the ports these tests use start; the host gives way upward if one is taken */
const TEST_PORT = 5390;

/** The file every test opens, relative to the workspace root */
const OPEN_REL_PATH = "diagram.jis.json";

/** The file the tests that switch away from OPEN_REL_PATH move to */
const OTHER_REL_PATH = "other.jis.json";

/**
 * How long the host waits for the windows to answer a flush. Shortened from the
 * three seconds it ships with, so that the tests where nobody answers do not sit
 * out the real wait
 */
const TEST_FLUSH_TIMEOUT_MS = 200;

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
	heldReads.clear();
	outsideWrite.fileName = null;
	outsideWrite.hasBeenRead = false;
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	for (const host of openHosts.splice(0)) {
		await host.close();
	}
	await rm(workspaceRoot, { recursive: true, force: true });
});

/**
 * Starts a host on the temporary workspace, with no browser put up.
 *
 * @param options What to override on top of the temporary workspace and the short
 *   flush timeout
 */
const startTestHost = async (
	options: {
		flushEditsTimeoutMs?: number;
		withFileLock?: <T>(filePath: string, task: () => Promise<T>) => Promise<T>;
	} = {},
): Promise<CanvasHost> => {
	const host = await startCanvasHost({
		workspaceRoot,
		port: TEST_PORT,
		shouldOpenBrowser: false,
		flushEditsTimeoutMs: TEST_FLUSH_TIMEOUT_MS,
		withFileLock: createPathLock(),
		...options,
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
 * Connects in place of a viewer and records what the host sends it. The token the
 * host hands out at /api/session is picked up first, as the page does.
 *
 * @param host The host to connect to
 * @param onRequest Called with every handleOpRequest, for a viewer that answers.
 *   Left out, the window stands for one that never answers
 * @param onFlush Called with every flushEdits, and answering is then its own
 *   business. Left out, the window answers at once, as one holding no edits does
 */
const connectFakeViewer = async (
	host: CanvasHost,
	onRequest?: (requestId: string, viewer: FakeViewer) => void,
	onFlush?: (requestId: string, viewer: FakeViewer) => void,
): Promise<FakeViewer> => {
	const socket = new WebSocket(
		`${host.url.replace("http", "ws")}/ws?token=${await readSessionToken(host.url)}`,
	);
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
		if (frame.type === "flushEdits") {
			if (onFlush === undefined) {
				viewer.send({ type: "flushed", requestId: frame.requestId });
				return;
			}
			onFlush(frame.requestId, viewer);
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

/** The frames that carry a revision, which is what a write has to name again */
type DocFrame = Extract<CanvasHostServerMessage, { revision: string }>;

const isDocFrame = (frame: CanvasHostServerMessage): frame is DocFrame =>
	frame.type === "openCanvas" || frame.type === "docChanged";

/**
 * The revision this window was last given, which is the one its save carries.
 *
 * @param viewer The window that would be saving
 */
const readLatestRevision = (viewer: FakeViewer): string => {
	const latest = [...viewer.receivedFrames].reverse().find(isDocFrame);
	if (latest === undefined) {
		throw new Error("the host gave this viewer no revision to write back with");
	}
	return latest.revision;
};

/** What a write came back as */
type PutOutcome = { status: number; body: Record<string, unknown> };

/**
 * Writes back the way the viewer's own save does: this host's token, the file on
 * display, and the revision the window was given.
 *
 * @param host The host to write through
 * @param relPath The file to write, relative to the workspace root
 * @param text What to write
 * @param revision The revision the write replaces. Left out, the header is not
 *   sent at all, which is the case the host answers with 428
 */
const putOpenFile = async (
	host: CanvasHost,
	relPath: string,
	text: string,
	revision?: string,
): Promise<PutOutcome> => {
	const response = await fetch(`${host.url}/api/file?path=${relPath}`, {
		method: "PUT",
		headers: {
			[SESSION_TOKEN_HEADER]: await readSessionToken(host.url),
			...(revision === undefined ? {} : { [REVISION_HEADER]: revision }),
		},
		body: text,
	});
	return {
		status: response.status,
		body: (await response.json()) as Record<string, unknown>,
	};
};

const emptyDocText = '{"version":1,"root":[]}\n';

/**
 * What a person's save puts in the file, in the tests that make one. A document
 * the host's parser accepts: a write carrying anything less is refused
 */
const savedDocText =
	'{"version":1,"root":[{"type":"rect","id":"saved-1","x":0,"y":0,"width":10,"height":10}]}\n';

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
			// The lowercase hex SHA-256 of the text, which the viewer names again
			// when it writes that text back
			revision: expect.stringMatching(/^[0-9a-f]{64}$/),
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

	it("does not send a save on a second time when it sees the write land", async () => {
		// The write is passed on to the windows as it lands; sending it again off
		// the back of the watch would reload the canvas the person who saved is
		// still editing
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);

		await putOpenFile(
			host,
			OPEN_REL_PATH,
			savedDocText,
			readLatestRevision(viewer),
		);
		await new Promise((resolve) => setTimeout(resolve, WATCH_SETTLE_MS));

		// The one frame is the write being passed on, not the watch reading it back
		expect(calcChangedTexts(viewer)).toEqual([savedDocText]);

		// The control: the watch is still running, so the silence above was the
		// echo being cancelled and not a watch that never fired
		const outsideText = '{"version":1,"root":[{"type":"text"}]}\n';
		await writeOpenFile(outsideText);
		await waitFor(() => calcChangedTexts(viewer).length > 1);
		expect(calcChangedTexts(viewer)).toEqual([savedDocText, outsideText]);
	});

	it("stops watching the file it was told to stop showing", async () => {
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await host.openFile(OTHER_REL_PATH);

		await writeOpenFile('{"version":1,"root":[{"type":"rect"}]}\n');
		await new Promise((resolve) => setTimeout(resolve, WATCH_SETTLE_MS));

		expect(calcChangedTexts(viewer)).toEqual([]);
		expect(host.getOpenPath()).toBe(OTHER_REL_PATH);
	});

	it("sends a file put back as it was after it went missing", async () => {
		// The windows were told the file is gone, so the same text coming back is
		// news to them; held back as already known, it would leave their error up
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);

		await rm(join(workspaceRoot, OPEN_REL_PATH));
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "docError"),
		);
		await writeOpenFile(emptyDocText);

		await waitFor(() => calcChangedTexts(viewer).length > 0);
		expect(calcChangedTexts(viewer)).toEqual([emptyDocText]);
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

describe("a person's save", () => {
	it("lands, and reaches the windows that did not make it", async () => {
		// The AI's headless window is one of these: left unsaid, it would answer the
		// next capture with the picture from before the person's edit
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const savingViewer = await connectFakeViewer(host);
		const watchingViewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			savingViewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);

		const outcome = await putOpenFile(
			host,
			OPEN_REL_PATH,
			savedDocText,
			readLatestRevision(savingViewer),
		);

		expect(outcome).toEqual({
			status: 200,
			body: { ok: true, revision: expect.stringMatching(/^[0-9a-f]{64}$/) },
		});
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			savedDocText,
		);
		await waitFor(() => calcChangedTexts(watchingViewer).length > 0);
		expect(calcChangedTexts(watchingViewer)).toEqual([savedDocText]);
		// The revision the window is told to carry from here on is the one the
		// write came back with
		expect(readLatestRevision(watchingViewer)).toBe(outcome.body.revision);
		// The window that wrote is sent it too, and drops the echo against the text
		// it sent (the viewer's applyIncomingDoc)
		expect(calcChangedTexts(savingViewer)).toEqual([savedDocText]);
	});

	it("is refused when the file has moved on, and changes nothing", async () => {
		// A tool rewrote the file after this window was last told about it. Writing
		// anyway would throw that rewrite away without a word
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		const staleRevision = readLatestRevision(viewer);
		const toolText = '{"version":1,"root":[{"type":"rect"}]}\n';
		await writeOpenFile(toolText);

		const outcome = await putOpenFile(
			host,
			OPEN_REL_PATH,
			savedDocText,
			staleRevision,
		);

		expect(outcome.status).toBe(412);
		// The revision it holds now comes back with the refusal, so the window can
		// tell it is behind rather than writing the same thing again
		expect(outcome.body.revision).toMatch(/^[0-9a-f]{64}$/);
		expect(outcome.body.revision).not.toBe(staleRevision);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			toolText,
		);
	});

	it("is refused when the file changes from outside the lock after the revision was checked", async () => {
		// Another process writing the file directly takes none of our locks. Landing
		// between the revision check and the rename, it was replaced by the save
		// without a word: the save answered 200, and the watch, finding the saved
		// text already known, told nobody
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		const revision = readLatestRevision(viewer);
		const outsideText =
			'{"version":1,"root":[{"type":"rect","id":"outside-1","x":5,"y":5,"width":20,"height":20}]}\n';
		outsideWrite.fileName = OPEN_REL_PATH;
		outsideWrite.text = outsideText;

		const outcome = await putOpenFile(
			host,
			OPEN_REL_PATH,
			savedDocText,
			revision,
		);

		// The injection has to have fired, or the test says nothing
		expect(outsideWrite.fileName).toBeNull();
		expect(outcome.status).toBe(412);
		expect(outcome.body.revision).toMatch(/^[0-9a-f]{64}$/);
		expect(outcome.body.revision).not.toBe(revision);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			outsideText,
		);
		// The save's temporary file went with the refusal
		expect(await readdir(workspaceRoot)).toEqual([OPEN_REL_PATH]);
		// The outside write reaches the windows, as any outside edit does
		await waitFor(() => calcChangedTexts(viewer).includes(outsideText));
	});

	it("is refused when the body is not a canvas document, and changes nothing", async () => {
		// The tools re-parse before they write; a window is held to the same bar
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);

		const outcome = await putOpenFile(
			host,
			OPEN_REL_PATH,
			'{"version":1,"root":"not a list"}\n',
			readLatestRevision(viewer),
		);

		expect(outcome.status).toBe(422);
		expect(outcome.body.error).toMatch(/not a valid canvas file/);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			emptyDocText,
		);
	});

	it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
		"fails rather than replacing a file it cannot read",
		async () => {
			// Only a file that is gone may be written without a revision to check;
			// one that is there but unreadable is not ours to overwrite
			await writeOpenFile(emptyDocText);
			const host = await startTestHost();
			const viewer = await connectFakeViewer(host);
			await host.openFile(OPEN_REL_PATH);
			await waitFor(() =>
				viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
			);
			const revision = readLatestRevision(viewer);
			const openFile = join(workspaceRoot, OPEN_REL_PATH);
			await chmod(openFile, 0o000);
			try {
				const outcome = await putOpenFile(
					host,
					OPEN_REL_PATH,
					savedDocText,
					revision,
				);
				expect(outcome.status).toBe(403);
			} finally {
				await chmod(openFile, 0o600);
			}
			expect(await readFile(openFile, "utf8")).toBe(emptyDocText);
		},
	);

	it("is refused when it names no revision at all", async () => {
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		await host.openFile(OPEN_REL_PATH);

		const outcome = await putOpenFile(host, OPEN_REL_PATH, savedDocText);

		expect(outcome.status).toBe(428);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			emptyDocText,
		);
	});

	it("is refused when it names a file other than the one on display", async () => {
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);

		const outcome = await putOpenFile(
			host,
			OTHER_REL_PATH,
			savedDocText,
			readLatestRevision(viewer),
		);

		expect(outcome.status).toBe(409);
		expect(await readFile(join(workspaceRoot, OTHER_REL_PATH), "utf8")).toBe(
			emptyDocText,
		);
	});

	it("waits for a tool's write to finish before it looks at the revision", async () => {
		// Both go through the same gate, so the save cannot read the file in the
		// middle of a tool's load → modify → write back and then write over it
		await writeOpenFile(emptyDocText);
		const events: string[] = [];
		const pathLock = createPathLock();
		// Every task the host puts through the gate, so the save can be waited for
		// to reach it before the tool lets go
		const lockedPaths: string[] = [];
		const host = await startTestHost({
			withFileLock: async (filePath, task) => {
				lockedPaths.push(filePath);
				return await pathLock(filePath, task);
			},
		});
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		const revision = readLatestRevision(viewer);
		const toolText = '{"version":1,"root":[{"type":"rect"}]}\n';
		// Held on an object because the tool's task is what fills it in
		const tool: { release: (() => void) | null } = { release: null };
		const toolWrite = pathLock(join(workspaceRoot, OPEN_REL_PATH), async () => {
			await new Promise<void>((resolve) => {
				tool.release = resolve;
			});
			await writeOpenFile(toolText);
			events.push("tool:write");
		});
		await waitFor(() => tool.release !== null);

		const saving = putOpenFile(
			host,
			OPEN_REL_PATH,
			savedDocText,
			revision,
		).then((outcome) => {
			events.push(`put:${String(outcome.status)}`);
		});
		await waitFor(() => lockedPaths.length === 1);
		tool.release?.();
		await toolWrite;
		await saving;

		// The save went second, saw the file the tool had left, and was refused
		// rather than writing over it
		expect(events).toEqual(["tool:write", "put:412"]);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			toolText,
		);
	});

	it("creates the file, directories and all, when there was none to read", async () => {
		// open_canvas makes the file before it shows it, so this is the case where
		// something removed it afterwards: there is nothing to overwrite, and the
		// window's text is all that is left of the canvas
		const nestedRelPath = "docs/nested/diagram.jis.json";
		const host = await startTestHost();
		await host.openFile(nestedRelPath);

		const outcome = await putOpenFile(
			host,
			nestedRelPath,
			savedDocText,
			"0".repeat(64),
		);

		expect(outcome.status).toBe(200);
		expect(await readFile(join(workspaceRoot, nestedRelPath), "utf8")).toBe(
			savedDocText,
		);
	});
});

describe("openFile", () => {
	it("keeps the file showing until the next one has been read", async () => {
		// While the next file is still being read, a save for the one on screen is
		// what a window can send, and it has to be taken; the file on display moves
		// only once there is something to show in its place
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OTHER_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		const revision = readLatestRevision(viewer);
		const heldRead: { release: (() => void) | null } = { release: null };
		heldReads.set(
			OPEN_REL_PATH,
			new Promise<void>((resolve) => {
				heldRead.release = resolve;
			}),
		);

		const switching = host.openFile(OPEN_REL_PATH);
		// The flush is answered at once by the fake viewer; give the read time to be
		// held before looking
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "flushEdits"),
		);
		expect(host.getOpenPath()).toBe(OTHER_REL_PATH);
		const outcome = await putOpenFile(
			host,
			OTHER_REL_PATH,
			savedDocText,
			revision,
		);
		expect(outcome.status).toBe(200);

		heldRead.release?.();
		await switching;
		expect(host.getOpenPath()).toBe(OPEN_REL_PATH);
	});

	it("leaves the newest call's file on display when two are in the air", async () => {
		// The first call's read is held up, so the second one overtakes it. Nothing
		// of the first may land after that: the file on display, the text the
		// windows hold and the file being watched all have to be the second's
		await writeOpenFile(emptyDocText);
		const otherText = '{"version":1,"root":[{"type":"rect"}]}\n';
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), otherText, "utf8");
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		// Held on an object because the promise's own executor fills it in
		const firstRead: { release: (() => void) | null } = { release: null };
		heldReads.set(
			OPEN_REL_PATH,
			new Promise<void>((resolve) => {
				firstRead.release = resolve;
			}),
		);

		const first = host.openFile(OPEN_REL_PATH);
		const second = host.openFile(OTHER_REL_PATH);
		await second;
		firstRead.release?.();
		await first;

		expect(host.getOpenPath()).toBe(OTHER_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		expect(
			viewer.receivedFrames
				.filter((frame) => frame.type === "openCanvas")
				.map((frame) => frame.relPath),
		).toEqual([OTHER_REL_PATH]);
		// The watch is the second call's too, and the text it compares against is
		// the second call's file rather than the first's
		const rewrittenText = '{"version":1,"root":[{"type":"text"}]}\n';
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), rewrittenText, "utf8");
		await waitFor(() => calcChangedTexts(viewer).length > 0);
		expect(calcChangedTexts(viewer)).toEqual([rewrittenText]);
	});
});

describe("flushViewers", () => {
	it("lets the buffered edits land before the file on display changes", async () => {
		// The file API takes a write only for the file on display, so edits still
		// sitting on the viewer's save debounce are lost to a 409 the moment
		// openFile moves on
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost({ flushEditsTimeoutMs: 5_000 });
		// What happened, in the order it happened, so that the write is shown to
		// have landed before the switch reached the window
		const events: string[] = [];
		// Filled in once the window has been told what it is showing, which is what
		// its write has to name
		const held: { revision: string | null } = { revision: null };
		const viewer = await connectFakeViewer(host, undefined, (requestId) => {
			void (async () => {
				const outcome = await putOpenFile(
					host,
					OPEN_REL_PATH,
					savedDocText,
					held.revision ?? "",
				);
				events.push(`put:${String(outcome.status)}`);
				viewer.send({ type: "flushed", requestId });
			})();
		});
		await host.openFile(OPEN_REL_PATH);
		await waitFor(() =>
			viewer.receivedFrames.some((frame) => frame.type === "openCanvas"),
		);
		held.revision = readLatestRevision(viewer);
		viewer.receivedFrames.length = 0;
		viewer.socket.on("message", (data) => {
			const frame = JSON.parse(String(data)) as CanvasHostServerMessage;
			if (frame.type === "openCanvas" && frame.relPath === OTHER_REL_PATH) {
				events.push("openCanvas:other");
			}
		});

		await host.openFile(OTHER_REL_PATH);
		await waitFor(() => events.includes("openCanvas:other"));

		expect(events).toEqual(["put:200", "openCanvas:other"]);
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			savedDocText,
		);
	});

	it("asks nobody when the same file is opened again", async () => {
		await writeOpenFile(emptyDocText);
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host);
		await host.openFile(OPEN_REL_PATH);

		await host.openFile(OPEN_REL_PATH);

		expect(
			viewer.receivedFrames.filter((frame) => frame.type === "flushEdits"),
		).toHaveLength(0);
	});

	it("goes on when a window never answers", async () => {
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost();
		const viewer = await connectFakeViewer(host, undefined, () => {
			// A window too old to know the frame, or one that is frozen
		});
		await host.openFile(OPEN_REL_PATH);

		await host.openFile(OTHER_REL_PATH);

		expect(host.getOpenPath()).toBe(OTHER_REL_PATH);
		expect(
			viewer.receivedFrames.filter((frame) => frame.type === "flushEdits"),
		).toHaveLength(1);
	});

	it("is not held up by a window that leaves without answering", async () => {
		await writeOpenFile(emptyDocText);
		await writeFile(join(workspaceRoot, OTHER_REL_PATH), emptyDocText, "utf8");
		const host = await startTestHost({ flushEditsTimeoutMs: 30_000 });
		const viewer = await connectFakeViewer(host, undefined, () => {
			viewer.socket.close();
		});
		await host.openFile(OPEN_REL_PATH);

		await host.openFile(OTHER_REL_PATH);

		expect(host.getOpenPath()).toBe(OTHER_REL_PATH);
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
