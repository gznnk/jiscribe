// A local host that shows the diagram the AI drew, on the spot, and lets a person
// fix it there. It brings up HTTP + WebSocket inside the MCP process and opens the
// viewer in a browser.
//
// The single source of truth is one .jis file in the workspace. The AI
// rewrites it through the path-based tools (add_rect and the rest), and the host
// watches the file and mirrors it into the viewer. A fix a person makes in the
// viewer is saved back through the file API (writeOpenFile), so the next time the
// AI reads the file it gets the shape the person left it in. That write goes
// through the same per-file lock the tools do and names the revision it replaces,
// so neither side lands on top of the other without noticing.
//
// Only the queries the file has no answer for (capture, camera, selection,
// measurement) are put to the viewer under a requestId (runHandleOp). The one
// other round trip is the flush the windows are asked for before the file on
// display changes (flushViewers).
//
// The window is either one a person looks at or a headless one the AI looks
// through (openHeadlessViewer). Both are viewers as far as everything here is
// concerned; where they differ is that a headless one has nobody to close it, so
// closing goes through the closeViewer frame rather than the browser's window.

import type { ChildProcess } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { unwatchFile, watchFile } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import type http from "node:http";
import path from "node:path";

import type { AiHandleOp } from "@jiscribe/ai-tools";
import { WebSocketServer, type WebSocket } from "ws";

import { CanvasHostError } from "./canvasHostError";
import {
	createViewerHttpServer,
	isAllowedHostHeader,
	isAllowedOrigin,
	type WriteOpenFileOutcome,
} from "./httpServer";
import { openBrowser } from "./openBrowser";
import type { BrowserOpenOptions } from "./openBrowser";
import { resolveViewerAssets } from "./viewerAssets";
import { resolveWorkspacePathReal } from "./workspacePaths";
import { writeFileAtomically } from "../atomicWrite";
import {
	HEADLESS_VIEWER_QUERY,
	isCanvasHostClientMessage,
	type CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";
import { SESSION_TOKEN_QUERY_PARAM } from "../shared/fileApiRoute";

/** The port tried first. Kept apart from studio's 5180 */
const DEFAULT_PORT = 5190;

/** How many times to step one port up when the port is already in use */
const PORT_ATTEMPT_COUNT = 20;

/**
 * Interval at which the target file is watched. Polling, because inotify does not
 * always arrive on WSL or across a network file system. Only ever one file is
 * being watched, so the load at this interval is negligible
 */
const WATCH_INTERVAL_MS = 300;

/**
 * How long to wait before giving up on the viewer answering a handleOpRequest. The
 * answer comes back even while a person is mid-drag, so the only thing this catches
 * is a frozen tab
 */
const HANDLE_OP_TIMEOUT_MS = 15_000;

/**
 * How long to wait, after sending closeViewer, before judging whether the window
 * closed. The viewer writes out the edits it has buffered before closing, so this
 * allows for that one round trip
 */
const VIEWER_CLOSE_TIMEOUT_MS = 5_000;

/**
 * How long openFile waits for the windows to write out the edits they have
 * buffered before it moves to another file. It is the viewer's save debounce plus
 * one round trip of the write, with room to spare: overshooting costs a person's
 * last edit, while waiting too long only holds up a file switch nobody is watching
 */
export const FLUSH_EDITS_TIMEOUT_MS = 3_000;

/**
 * The grace period between the last viewer leaving and onViewersGone being called.
 * It is long because the connection is lost while nobody is closing anything: a
 * browser discards or freezes a window left in the background, and the page only
 * reconnects once a person comes back to it. With the host gone by then there is
 * nowhere to reconnect to, and the AI has to open the canvas again. The port is
 * given back when the MCP client leaves in any case, so holding it for the length
 * of a break costs nothing (the process outlives the host either way)
 */
const IDLE_SHUTDOWN_DELAY_MS = 60 * 60 * 1_000;

/**
 * How long to wait for a headless window to connect back after it was spawned. A
 * Chromium starting cold has to come up before its page can reach the WebSocket,
 * so this is generous; nothing waits this long unless the browser never arrives
 */
const HEADLESS_CONNECT_TIMEOUT_MS = 20_000;

/**
 * The answer to a handleOpRequest. canvas-agent's AiCanvasOpResult with the
 * requestId dropped
 */
export type HandleOpOutcome = {
	ok: boolean;
	/** The body returned to the AI. On failure, the reason itself */
	text: string;
	/** The PNG (base64), present only for capture_canvas */
	imagePngBase64?: string;
};

/** The result of openHeadlessViewer */
export type HeadlessViewerOutcome =
	| {
			ok: true;
			/**
			 * false when a viewer was already connected and was used as it is (a
			 * window a person opened counts)
			 */
			didOpenWindow: boolean;
	  }
	| {
			ok: false;
			/** Why there is no eye: no Chromium to run, or none that connected */
			reason: string;
	  };

/** The result of closeViewers. A window that could not be closed keeps running */
export type ViewerCloseOutcome = {
	/** How many windows closed */
	closedCount: number;
	/** How many windows stayed open, refused by the browser or otherwise */
	remainingCount: number;
};

export type CanvasHost = {
	/** The viewer's URL, returned to the AI for a person to open */
	readonly url: string;
	/** The directory the file API and path resolution are relative to (absolute path) */
	readonly workspaceRoot: string;
	/**
	 * Switches the file on display. A connected viewer gets it immediately; with
	 * none connected, the next viewer to connect opens it. Calls are taken one at
	 * a time in the order they are made, and one overtaken by a newer call leaves
	 * the newer call's file on display rather than its own
	 *
	 * @param relPath Path relative to workspaceRoot
	 */
	openFile: (relPath: string) => Promise<void>;
	/**
	 * The file currently on display (relative to workspaceRoot), or null when none
	 * is set
	 */
	getOpenPath: () => string | null;
	/**
	 * Asks every open window to write out the edits it is still holding on its save
	 * debounce, and waits for them to say they are done. A window that closes while
	 * being waited on counts as answered, and with none open it returns straight
	 * away.
	 *
	 * @param timeoutMs How long to wait (milliseconds) before going on without the
	 *   windows that have not answered. A write the viewer reports as failed counts
	 *   as an answer, so this only catches a frozen or too-old window
	 */
	flushViewers: (timeoutMs: number) => Promise<void>;
	/**
	 * Asks the viewer for an operation only the drawn result can answer (capture,
	 * camera, selection, measurement).
	 *
	 * @param op The operation to run
	 * @returns A result that can be handed to the AI as it is. Even when no viewer
	 *   is connected, or none answers, it returns ok=false rather than throwing (all
	 *   the AI needs is a readable reason)
	 */
	runHandleOp: (op: AiHandleOp) => Promise<HandleOpOutcome>;
	/**
	 * Makes the open viewer windows close.
	 *
	 * @returns How many closed and how many remain. Chromium sometimes refuses to
	 *   close a window other than one "a script opened", and those show up in
	 *   remainingCount
	 */
	closeViewers: () => Promise<ViewerCloseOutcome>;
	/**
	 * Whether a window a person can see is connected. A headless one does not
	 * count: it holds the host open without putting anything on screen
	 */
	hasVisibleViewer: () => boolean;
	/**
	 * Opens a window for a person to look at. Nothing is opened when
	 * `JISCRIBE_MCP_NO_OPEN` says not to, and nothing waits for it to connect.
	 * `shouldOpenBrowser: false` does not hold it back: that one is about what
	 * starting the host does, not about what may be opened afterwards
	 */
	openVisibleViewer: () => void;
	/**
	 * Opens one window-less browser for the AI to look through, and waits until its
	 * page has connected. With a viewer already connected, nothing is opened and
	 * that one is used.
	 *
	 * @returns Whether there is now an eye on the canvas. A failure carries the
	 *   reason rather than leaving the caller to find out by the next screen
	 *   operation timing out
	 */
	openHeadlessViewer: () => Promise<HeadlessViewerOutcome>;
	/**
	 * Waits for a viewer to be connected.
	 *
	 * @param timeoutMs How long to wait (milliseconds). It returns straight away
	 *   when one is connected already
	 * @returns Whether a viewer is connected. false on running out of time, and on
	 *   the host being closed while waiting
	 */
	waitForViewer: (timeoutMs: number) => Promise<boolean>;
	/**
	 * Whether a headless window is connected right now. What it tells the caller is
	 * that a window nobody can see is holding the host, so "close it by hand" is
	 * not advice that can be followed
	 */
	hasHeadlessViewer: () => boolean;
	/**
	 * Tears down the watch, the WebSocket and the HTTP server. Calling it twice is
	 * harmless
	 */
	close: () => Promise<void>;
};

export type CanvasHostOptions = {
	/** The directory the file API is relative to (absolute path) */
	workspaceRoot: string;
	/** The port tried first (default 5190). While it is taken, steps one port up */
	port?: number;
	/**
	 * With false, starting the host opens no browser and only the URL is returned;
	 * openVisibleViewer can still put a window up later. When omitted,
	 * nothing is opened if the environment variable `JISCRIBE_MCP_NO_OPEN` holds
	 * anything (an escape hatch for running the MCP where there is no browser; the
	 * value does not matter, so "1" and "true" both work). How it is opened is
	 * chosen by `JISCRIBE_MCP_BROWSER` (see openBrowser)
	 */
	shouldOpenBrowser?: boolean;
	/**
	 * Called once every viewer that was connected has left and none has come back
	 * within the grace period. The host does not tear itself down, so the caller
	 * must close it and drop the reference. It is not called until at least one
	 * viewer has connected (so that nothing is torn down while a browser is still
	 * starting up, or when the setting is not to open one at all).
	 *
	 * It says the windows are gone, not that a person closed them: a headless
	 * window holds the connection just as a visible one does, so as long as one is
	 * open this is not reached
	 */
	onViewersGone?: () => void;
	/**
	 * The grace period between the last viewer leaving and onViewersGone being
	 * called (milliseconds, default one hour). It covers a window a browser put to
	 * sleep in the background, which reconnects only when a person returns to it,
	 * so shorten it only when there is a reason not to wait (tests)
	 */
	idleShutdownDelayMs?: number;
	/**
	 * How long openFile waits for the windows to write out their buffered edits
	 * before it switches file (milliseconds, default 3000). Shortening it only makes
	 * sense where no window is going to answer at all (tests)
	 */
	flushEditsTimeoutMs?: number;
	/**
	 * How long openHeadlessViewer waits for the window it spawned to connect
	 * (milliseconds, default 20000). Shortening it only makes sense where no
	 * browser is going to arrive at all (tests)
	 */
	headlessConnectTimeoutMs?: number;
	/**
	 * Runs one file's task with the tasks queued ahead of it for that file, so a
	 * write from the viewer and a rewrite from an AI tool never overlap. The MCP
	 * server passes its own path lock, the one every tool goes through; left out,
	 * a task runs straight away, which is enough where nothing else writes (tests)
	 *
	 * @param filePath The file the task touches (absolute path, as the tools
	 *   resolve it — the lock is keyed on it)
	 * @param task What to run once the file is free
	 */
	withFileLock?: <T>(filePath: string, task: () => Promise<T>) => Promise<T>;
	/**
	 * What launches the browser. It is only ever passed by tests, which have no
	 * browser to launch and want the URL the window would have been given
	 */
	launchBrowser?: (url: string, browserOptions: BrowserOpenOptions) => void;
};

const isAddressInUseError = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "EADDRINUSE";

/**
 * Tries to listen until a free port is found.
 *
 * @param server The HTTP server to listen with
 * @param startPort The port tried first
 * @returns The port it actually managed to listen on
 */
const listenOnAvailablePort = async (
	server: http.Server,
	startPort: number,
): Promise<number> => {
	for (let offset = 0; offset < PORT_ATTEMPT_COUNT; offset += 1) {
		const port = startPort + offset;
		const isListening = await new Promise<boolean>((resolve, reject) => {
			const handleError = (error: unknown): void => {
				server.removeListener("listening", handleListening);
				if (isAddressInUseError(error)) {
					resolve(false);
					return;
				}
				reject(error instanceof Error ? error : new Error(String(error)));
			};
			const handleListening = (): void => {
				server.removeListener("error", handleError);
				resolve(true);
			};
			server.once("error", handleError);
			server.once("listening", handleListening);
			server.listen(port, "127.0.0.1");
		});
		if (isListening) {
			return port;
		}
	}
	throw new CanvasHostError(
		`no free port in ${startPort}-${startPort + PORT_ATTEMPT_COUNT - 1}`,
	);
};

/**
 * Reads the session token off a WebSocket URL.
 *
 * @param requestUrl The upgrade request's target, which carries no origin
 * @returns The token as written, or null when the URL carries none
 */
const readSessionTokenQuery = (requestUrl: string | undefined): string | null =>
	new URL(requestUrl ?? "/", "http://localhost").searchParams.get(
		SESSION_TOKEN_QUERY_PARAM,
	);

/**
 * Waits until every connection passed in has closed.
 *
 * @param sockets What to wait on; already-closed ones mixed in are fine
 * @param timeoutMs Past this, gives up and leaves any still-open connection as it is
 */
const waitForSocketsToClose = async (
	sockets: readonly WebSocket[],
	timeoutMs: number,
): Promise<void> => {
	await new Promise<void>((resolve) => {
		let pendingCount = sockets.filter(
			(socket) => socket.readyState === socket.OPEN,
		).length;
		if (pendingCount === 0) {
			resolve();
			return;
		}
		const handleClose = (): void => {
			pendingCount -= 1;
			if (pendingCount === 0) {
				finish();
			}
		};
		const finish = (): void => {
			clearTimeout(timer);
			for (const socket of sockets) {
				socket.off("close", handleClose);
			}
			resolve();
		};
		const timer = setTimeout(finish, timeoutMs);
		for (const socket of sockets) {
			socket.on("close", handleClose);
		}
	});
};

/**
 * The revision a text is handed out under, and has to be named by again when it is
 * written back.
 *
 * @param docText The text as the viewer was given it, or as it was just written
 * @returns The lowercase hex SHA-256 of the text's UTF-8 bytes
 */
const calcDocRevision = (docText: string): string =>
	createHash("sha256").update(docText, "utf8").digest("hex");

/**
 * Reads a file, answering null for one that cannot be read at all.
 *
 * @param file The file to read (absolute path)
 */
const readFileQuietly = async (file: string): Promise<string | null> => {
	try {
		return await readFile(file, "utf8");
	} catch {
		return null;
	}
};

/**
 * Starts the canvas host. It brings up HTTP + WebSocket and opens the viewer in a
 * browser (by default Chromium's `--app=`, which gives a window with no frame and
 * no tabs).
 *
 * @param options workspaceRoot must be an absolute path; the viewer never touches a
 *   file outside that directory
 * @returns The started host. Nothing is on display yet, so call openFile next
 */
export async function startCanvasHost(
	options: CanvasHostOptions,
): Promise<CanvasHost> {
	const workspaceRoot = path.resolve(options.workspaceRoot);
	const { viewerHtml, assetRootPath } = resolveViewerAssets();
	// The file on display, and the text last handed out as its content. Kept so that
	// nothing is said when the change the watcher picked up is our own write (or a
	// person's save) coming back
	let openPath: string | null = null;
	let lastKnownText: string | null = null;
	// The revision of lastKnownText, so that the two are never out of step. Set
	// through recordKnownText / clearKnownText alone
	let lastKnownRevision: string | null = null;
	let watchedFile: string | null = null;

	/**
	 * Records the text the open file is now believed to hold.
	 *
	 * @param text The text as it was read or written
	 * @returns Its revision, which is what the viewer is given alongside it
	 */
	const recordKnownText = (text: string): string => {
		lastKnownText = text;
		lastKnownRevision = calcDocRevision(text);
		return lastKnownRevision;
	};

	/** Forgets the text, for a file that cannot be read at all */
	const clearKnownText = (): void => {
		lastKnownText = null;
		lastKnownRevision = null;
	};

	const withFileLock: NonNullable<CanvasHostOptions["withFileLock"]> =
		options.withFileLock ?? ((_filePath, task) => task());

	// One token per host, handed out at /api/session and demanded of every write and
	// every WebSocket. A window left over from the host that served another
	// workspace on this port reconnects with the token it was given, is refused, and
	// rejoins once it has picked this host's up
	const sessionToken = randomUUID();
	const server = createViewerHttpServer({
		workspaceRoot,
		viewerHtml,
		assetRootPath,
		sessionToken,
		writeOpenFile: (relPath, body, ifMatch) =>
			writeOpenFile(relPath, body, ifMatch),
	});
	const port = await listenOnAvailablePort(
		server,
		options.port ?? DEFAULT_PORT,
	);
	// The address it binds, rather than a name: a machine that resolves localhost to
	// ::1 first would otherwise be sent to whatever listens on that port there
	const url = `http://127.0.0.1:${port}`;

	let isClosed = false;
	const sockets = new Set<WebSocket>();
	const webSocketServer = new WebSocketServer({
		server,
		path: "/ws",
		verifyClient: ({ req }, done) => {
			// The port the upgrade arrived on is this server's own, the same way the
			// HTTP handler reads it
			const listeningPort = req.socket.localPort ?? 0;
			if (!isAllowedHostHeader(req.headers.host, listeningPort)) {
				done(false, 400, "unexpected Host header");
				return;
			}
			const originHeader = req.headers.origin;
			// A browser always puts an Origin on a WebSocket, so a missing one is a
			// client that is not a browser (a test, a script) and is taken as it
			// comes; a foreign one is a page on another site reaching in
			if (
				originHeader !== undefined &&
				!isAllowedOrigin(originHeader, listeningPort)
			) {
				done(false, 403, "unexpected Origin header");
				return;
			}
			if (readSessionTokenQuery(req.url) !== sessionToken) {
				done(false, 401, "invalid session token");
				return;
			}
			done(true);
		},
	});

	// State for tying the host's lifetime to the windows'. Tearing down before
	// anything has ever connected leaves a browser that is still starting up with
	// nowhere to connect to
	let hasEverConnected = false;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * The headless browser this host spawned, while it is still ours to kill. It is
	 * a last resort only: the way a window is actually closed is the closeViewer
	 * frame (see close)
	 */
	let headlessBrowserProcess: ChildProcess | null = null;

	/**
	 * The sockets belonging to a headless window. A window a person can see is the
	 * one that has to be there before open_canvas can say the canvas is on screen,
	 * so the two are told apart by the query the page carries (see the viewer's App)
	 */
	const headlessSockets = new WeakSet<WebSocket>();

	/** Callers of waitForViewer, each settling its own wait */
	const viewerWaiters = new Set<(isConnected: boolean) => void>();

	const settleViewerWaiters = (isConnected: boolean): void => {
		for (const settle of [...viewerWaiters]) {
			settle(isConnected);
		}
	};

	const countOpenSockets = (): number =>
		[...sockets].filter((socket) => socket.readyState === socket.OPEN).length;

	const hasVisibleViewer = (): boolean =>
		[...sockets].some(
			(socket) =>
				socket.readyState === socket.OPEN && !headlessSockets.has(socket),
		);

	const hasHeadlessViewer = (): boolean =>
		[...sockets].some(
			(socket) =>
				socket.readyState === socket.OPEN && headlessSockets.has(socket),
		);

	const waitForViewer = async (timeoutMs: number): Promise<boolean> => {
		if (countOpenSockets() > 0) {
			return true;
		}
		if (isClosed) {
			return false;
		}
		return await new Promise<boolean>((resolve) => {
			const settle = (isConnected: boolean): void => {
				clearTimeout(timer);
				viewerWaiters.delete(settle);
				resolve(isConnected);
			};
			const timer = setTimeout(() => {
				settle(false);
			}, timeoutMs);
			viewerWaiters.add(settle);
		});
	};

	const cancelIdleShutdown = (): void => {
		if (idleTimer !== null) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	};

	const scheduleIdleShutdown = (): void => {
		if (options.onViewersGone === undefined || !hasEverConnected || isClosed) {
			return;
		}
		cancelIdleShutdown();
		idleTimer = setTimeout(() => {
			idleTimer = null;
			if (sockets.size === 0 && !isClosed) {
				options.onViewersGone?.();
			}
		}, options.idleShutdownDelayMs ?? IDLE_SHUTDOWN_DELAY_MS);
	};

	/**
	 * handleOpRequests awaiting an answer. Every socket asked is kept so that, when
	 * all of them leave without a word, the wait is ended instead of hanging
	 */
	const pendingHandleOps = new Map<
		string,
		{
			/**
			 * The connections still expected to answer. Each close removes one; once
			 * it is empty, the request settles as a failure
			 */
			askedSockets: Set<WebSocket>;
			settle: (outcome: HandleOpOutcome) => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();

	/**
	 * flushEdits requests awaiting an answer, kept the same way as pendingHandleOps:
	 * every socket asked is held, so that windows leaving without a word end the wait
	 * instead of making the file switch sit out the whole timeout
	 */
	const pendingFlushes = new Map<
		string,
		{
			askedSockets: Set<WebSocket>;
			settle: () => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();

	const settleFlush = (requestId: string): void => {
		const pending = pendingFlushes.get(requestId);
		if (pending === undefined) {
			return;
		}
		clearTimeout(pending.timer);
		pendingFlushes.delete(requestId);
		pending.settle();
	};

	/**
	 * Marks one window as done with a flush, and ends the wait it was the last one
	 * holding up.
	 *
	 * @param requestId The flush being answered. An answer to one already settled is
	 *   let go, so a word arriving late cannot count towards the next flush
	 * @param socket The connection that answered
	 */
	const recordFlushAnswer = (requestId: string, socket: WebSocket): void => {
		const pending = pendingFlushes.get(requestId);
		if (pending === undefined) {
			return;
		}
		if (
			pending.askedSockets.delete(socket) &&
			pending.askedSockets.size === 0
		) {
			settleFlush(requestId);
		}
	};

	/**
	 * Drops one socket from every flush still waiting, and ends the waits it was the
	 * last one holding up.
	 *
	 * @param socket The connection that went away
	 */
	const dropSocketFromFlushes = (socket: WebSocket): void => {
		for (const [requestId, pending] of pendingFlushes) {
			if (
				pending.askedSockets.delete(socket) &&
				pending.askedSockets.size === 0
			) {
				settleFlush(requestId);
			}
		}
	};

	const settleHandleOp = (
		requestId: string,
		outcome: HandleOpOutcome,
	): void => {
		const pending = pendingHandleOps.get(requestId);
		if (pending === undefined) {
			return;
		}
		clearTimeout(pending.timer);
		pendingHandleOps.delete(requestId);
		pending.settle(outcome);
	};

	const broadcast = (message: CanvasHostServerMessage): void => {
		const frame = JSON.stringify(message);
		for (const socket of sockets) {
			if (socket.readyState === socket.OPEN) {
				socket.send(frame);
			}
		}
	};

	/**
	 * Reads the file on display. Returns null when it cannot be read, and tells the
	 * viewer why (the AI side hears it separately through the tool's return value,
	 * so nothing is thrown here).
	 */
	const readOpenFileText = async (relPath: string): Promise<string | null> => {
		try {
			return await readFile(path.resolve(workspaceRoot, relPath), "utf8");
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			broadcast({ type: "docError", relPath, message: reason });
			return null;
		}
	};

	/**
	 * Takes in one write from the viewer: the file on display, at the revision the
	 * window that wrote it was last given.
	 *
	 * It runs under the lock the AI's tools take, so a person's save and a tool's
	 * rewrite are never in the air at once, and the revision is compared against
	 * what the file holds at that moment.
	 *
	 * @param relPath The file to write, relative to workspaceRoot
	 * @param body The bytes to write, as they arrived
	 * @param ifMatch The revision this write replaces
	 * @returns What became of it. A path leading out of the workspace, or a write
	 *   that fails, is thrown rather than returned
	 */
	const writeOpenFile = async (
		relPath: string,
		body: Buffer,
		ifMatch: string,
	): Promise<WriteOpenFileOutcome> => {
		return await withFileLock(
			path.resolve(workspaceRoot, relPath),
			async (): Promise<WriteOpenFileOutcome> => {
				// Read again under the lock: the file on display may have moved on
				// while this write waited its turn
				if (relPath !== openPath) {
					return { kind: "not-open" };
				}
				const resolvedFile = await resolveWorkspacePathReal(
					workspaceRoot,
					relPath,
				);
				// What the file holds is read rather than taken from lastKnownText: a
				// tool's write is on disk before the watch (which polls) has told
				// anyone, and comparing against what was last handed out would let
				// this write land on top of it
				const currentText = await readFileQuietly(resolvedFile);
				// A file nobody can read holds nothing this write could overwrite, so
				// it is let through rather than refused over a revision there is none of
				if (currentText !== null) {
					const currentRevision = calcDocRevision(currentText);
					if (ifMatch !== currentRevision) {
						return { kind: "revision-mismatch", revision: currentRevision };
					}
				}
				// The parent directory has already resolved inside the workspace, so it
				// is safe to create
				await mkdir(path.dirname(resolvedFile), { recursive: true });
				await writeFileAtomically(resolvedFile, body);
				// Recorded from the bytes that were written, so the watch reads its own
				// write back as something already known and says nothing
				const writtenText = body.toString("utf8");
				const revision = recordKnownText(writtenText);
				// Every window is told, the one that wrote included: it drops the echo
				// against the text it sent and takes the revision with it
				broadcast({
					type: "docChanged",
					relPath,
					docText: writtenText,
					revision,
				});
				return { kind: "written", revision };
			},
		);
	};

	const stopWatching = (): void => {
		if (watchedFile !== null) {
			unwatchFile(watchedFile);
			watchedFile = null;
		}
	};

	const startWatching = (relPath: string): void => {
		stopWatching();
		const absolutePath = path.resolve(workspaceRoot, relPath);
		watchedFile = absolutePath;
		watchFile(absolutePath, { interval: WATCH_INTERVAL_MS }, () => {
			void (async () => {
				// A firing right after a switch can still point at the old target
				if (openPath !== relPath) {
					return;
				}
				const text = await readOpenFileText(relPath);
				if (text === null || text === lastKnownText) {
					return;
				}
				broadcast({
					type: "docChanged",
					relPath,
					docText: text,
					revision: recordKnownText(text),
				});
			})();
		});
	};

	webSocketServer.on("connection", (socket, request) => {
		sockets.add(socket);
		if ((request.url ?? "").includes(HEADLESS_VIEWER_QUERY)) {
			headlessSockets.add(socket);
		}
		hasEverConnected = true;
		cancelIdleShutdown();
		settleViewerWaiters(true);
		socket.on("message", (data) => {
			let frame: unknown;
			try {
				frame = JSON.parse(String(data));
			} catch {
				return;
			}
			if (!isCanvasHostClientMessage(frame)) {
				return;
			}
			if (frame.type === "handleOpResult") {
				settleHandleOp(frame.requestId, {
					ok: frame.ok,
					text: frame.text,
					...(frame.imagePngBase64 === undefined
						? {}
						: { imagePngBase64: frame.imagePngBase64 }),
				});
				return;
			}
			recordFlushAnswer(frame.requestId, socket);
		});
		socket.on("close", () => {
			sockets.delete(socket);
			if (sockets.size === 0) {
				scheduleIdleShutdown();
			}
			// A window that left wrote out what it could on its way (beforeunload), and
			// there is nothing more to wait for either way
			dropSocketFromFlushes(socket);
			// Once every socket asked has left, nobody is left to answer that request
			for (const [requestId, pending] of pendingHandleOps) {
				if (
					pending.askedSockets.delete(socket) &&
					pending.askedSockets.size === 0
				) {
					settleHandleOp(requestId, {
						ok: false,
						text: "the canvas viewer was closed before it could answer",
					});
				}
			}
		});
		// The order connections arrive in does not matter: if a file to open is
		// already chosen, send it right away
		if (
			openPath !== null &&
			lastKnownText !== null &&
			lastKnownRevision !== null
		) {
			socket.send(
				JSON.stringify({
					type: "openCanvas",
					relPath: openPath,
					docText: lastKnownText,
					revision: lastKnownRevision,
				} satisfies CanvasHostServerMessage),
			);
		}
	});

	const launchBrowser = options.launchBrowser ?? openBrowser;

	// The escape hatch for a machine with no browser. It is read on every open
	// rather than once at startup, so it holds wherever the call comes from
	const isBrowserOpeningAllowed = (): boolean =>
		(process.env.JISCRIBE_MCP_NO_OPEN ?? "") === "";

	const openVisibleViewer = (): void => {
		if (!isBrowserOpeningAllowed()) {
			return;
		}
		launchBrowser(url, {});
	};

	// shouldOpenBrowser is about this moment alone: a host started for a headless
	// window puts nothing up now, and still opens one later if asked
	if (options.shouldOpenBrowser ?? isBrowserOpeningAllowed()) {
		launchBrowser(url, {});
	}

	/**
	 * Asks the given windows to close and waits for them to go.
	 *
	 * @param targets Open sockets, one per window asked
	 */
	const closeSockets = async (
		targets: readonly WebSocket[],
	): Promise<ViewerCloseOutcome> => {
		if (targets.length === 0) {
			return { closedCount: 0, remainingCount: 0 };
		}
		const frame = JSON.stringify({
			type: "closeViewer",
		} satisfies CanvasHostServerMessage);
		for (const socket of targets) {
			socket.send(frame);
		}
		await waitForSocketsToClose(targets, VIEWER_CLOSE_TIMEOUT_MS);
		// A window going away takes its connection with it, so what is left is a
		// window that refused to close
		const remainingCount = targets.filter(
			(candidate) => candidate.readyState === candidate.OPEN,
		).length;
		return {
			closedCount: targets.length - remainingCount,
			remainingCount,
		};
	};

	const openSockets = (): WebSocket[] =>
		[...sockets].filter((candidate) => candidate.readyState === candidate.OPEN);

	const closeViewers = (): Promise<ViewerCloseOutcome> =>
		closeSockets(openSockets());

	/**
	 * Asks every open window to write out what it is holding, and waits for the
	 * answers.
	 *
	 * @param timeoutMs How long to wait before going on without the windows that
	 *   stayed silent
	 */
	const flushViewers = async (timeoutMs: number): Promise<void> => {
		const askedSockets = openSockets();
		if (askedSockets.length === 0) {
			return;
		}
		const requestId = randomUUID();
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				settleFlush(requestId);
			}, timeoutMs);
			pendingFlushes.set(requestId, {
				askedSockets: new Set(askedSockets),
				settle: resolve,
				timer,
			});
			const frame = JSON.stringify({
				type: "flushEdits",
				requestId,
			} satisfies CanvasHostServerMessage);
			for (const socket of askedSockets) {
				socket.send(frame);
			}
		});
	};

	/**
	 * The open still running, so a second call joins it instead of spawning a
	 * Chromium of its own: both would pass the "nobody is connected" test, and only
	 * the last child handed over would be remembered to be killed
	 */
	let headlessOpening: Promise<HeadlessViewerOutcome> | null = null;

	const runHeadlessOpen = async (): Promise<HeadlessViewerOutcome> => {
		if (isClosed) {
			return { ok: false, reason: "the canvas host is already shut down" };
		}
		if (countOpenSockets() > 0) {
			return { ok: true, didOpenWindow: false };
		}
		// Held on an object because the callback that fills it in runs while the
		// wait below is in flight
		const launchOutcome: { failure: string | null } = { failure: null };
		launchBrowser(`${url}?${HEADLESS_VIEWER_QUERY}`, {
			mode: "headless",
			onSpawn: (child) => {
				// The host can be folded up while the browser is still coming up.
				// Holding on to a process the closed host will never kill would
				// leave a window-less Chromium behind for good
				if (isClosed) {
					child.kill();
					return;
				}
				headlessBrowserProcess = child;
			},
			onFailure: (reason) => {
				launchOutcome.failure = reason;
				// Nothing is coming, so the wait below is not left to run its
				// full course. Only the headless open ever waits, so this cannot
				// cut short a wait someone else started
				settleViewerWaiters(false);
			},
		});
		// Having no candidate at all is known before any of them is spawned, so
		// there is nothing to wait for
		if (launchOutcome.failure !== null) {
			return { ok: false, reason: launchOutcome.failure };
		}
		const isConnected = await waitForViewer(
			options.headlessConnectTimeoutMs ?? HEADLESS_CONNECT_TIMEOUT_MS,
		);
		if (isConnected) {
			return { ok: true, didOpenWindow: true };
		}
		return {
			ok: false,
			reason:
				launchOutcome.failure ??
				"a headless browser was started but its page never connected back",
		};
	};

	const openHeadlessViewer = (): Promise<HeadlessViewerOutcome> => {
		if (headlessOpening !== null) {
			return headlessOpening;
		}
		const opening = runHeadlessOpen().finally(() => {
			if (headlessOpening === opening) {
				headlessOpening = null;
			}
		});
		headlessOpening = opening;
		return opening;
	};

	/**
	 * The openFile queued last, which the next call waits on. Without it two calls
	 * interleave over their reads, and the file on display ends up paired with the
	 * other one's text and watch
	 */
	let openFileChain: Promise<void> = Promise.resolve();

	/** How many openFile calls have been made, which names the newest of them */
	let openFileCallCount = 0;

	const openFile = (relPath: string): Promise<void> => {
		openFileCallCount += 1;
		const callNumber = openFileCallCount;
		// A call overtaken while it waited has nothing left to say: the file the
		// newer call names is the one to end up on display
		const isNewestCall = (): boolean => callNumber === openFileCallCount;
		const run = async (): Promise<void> => {
			if (!isNewestCall()) {
				return;
			}
			// The windows may still be holding a person's edits on the save debounce,
			// and the write those edits are about to go out as is refused once the
			// file on display has moved on (the file API takes a write only for that
			// file). So they are asked for while the old path is still the open one
			if (openPath !== null && openPath !== relPath) {
				await flushViewers(
					options.flushEditsTimeoutMs ?? FLUSH_EDITS_TIMEOUT_MS,
				);
				if (!isNewestCall()) {
					return;
				}
			}
			openPath = relPath;
			const text = await readOpenFileText(relPath);
			if (!isNewestCall()) {
				return;
			}
			startWatching(relPath);
			if (text === null) {
				clearKnownText();
				return;
			}
			broadcast({
				type: "openCanvas",
				relPath,
				docText: text,
				revision: recordKnownText(text),
			});
		};
		const queued = openFileChain.then(run, run);
		openFileChain = queued.then(
			() => undefined,
			() => undefined,
		);
		return queued;
	};

	return {
		url,
		workspaceRoot,
		getOpenPath: () => openPath,
		runHandleOp: async (op) => {
			// Ask every open tab and take the first answer.
			//
			// Not narrowing it to one, because the socket on the other end is not
			// necessarily "the screen being looked at". The viewer reconnects on its
			// own once cut off, so a tab left open and forgotten in an earlier session
			// joins the new host later. Such a tab may be an old build that does not
			// know handleOpRequest, and asking only that one times out silently.
			const askedSockets = [...sockets].filter(
				(candidate) => candidate.readyState === candidate.OPEN,
			);
			if (askedSockets.length === 0) {
				return {
					ok: false,
					text: "no canvas viewer is connected, so there is nothing on screen to capture, move, select, or measure; open one with open_canvas and keep the browser tab open",
				};
			}
			const requestId = randomUUID();
			return await new Promise<HandleOpOutcome>((resolve) => {
				const timer = setTimeout(() => {
					settleHandleOp(requestId, {
						ok: false,
						text: "the canvas viewer did not answer in time",
					});
				}, HANDLE_OP_TIMEOUT_MS);
				pendingHandleOps.set(requestId, {
					askedSockets: new Set(askedSockets),
					settle: resolve,
					timer,
				});
				const frame = JSON.stringify({
					type: "handleOpRequest",
					requestId,
					op,
				} satisfies CanvasHostServerMessage);
				for (const socket of askedSockets) {
					socket.send(frame);
				}
			});
		},
		closeViewers,
		flushViewers,
		waitForViewer,
		hasVisibleViewer,
		openVisibleViewer,
		hasHeadlessViewer,
		openHeadlessViewer,
		openFile,
		close: async () => {
			if (isClosed) {
				return;
			}
			// Marked closed before anything is awaited, so a second call on the way
			// in leaves at the guard above
			isClosed = true;
			settleViewerWaiters(false);
			// A headless window has nobody to close it, and cutting the socket first
			// would only leave it reconnecting. The closeViewer frame is the way that
			// works everywhere, so it goes before the teardown. Only the headless
			// windows are asked: a window a person is looking at is left to reconnect
			// to whatever host comes next, which is what a workspace switch relies on
			if (headlessBrowserProcess !== null) {
				const browserProcess = headlessBrowserProcess;
				headlessBrowserProcess = null;
				// The kill goes first because it is the one step with a deadline over
				// it: the caller ends the process outright shortly after the waits
				// here are due (FORCED_EXIT_DELAY_MS in index.ts), and a kill left
				// behind them is never reached. Killing the child reaches the browser
				// only when it is a local one. A Windows-side .exe spawned from WSL is
				// reached through an interop proxy, and the kill takes the proxy while
				// the browser lives on, which is why the frame below still goes out
				browserProcess.kill();
				await closeSockets(
					openSockets().filter((socket) => headlessSockets.has(socket)),
				);
			}
			cancelIdleShutdown();
			stopWatching();
			for (const requestId of [...pendingHandleOps.keys()]) {
				settleHandleOp(requestId, {
					ok: false,
					text: "the canvas host was shut down before the viewer answered",
				});
			}
			// Nothing written after this point would reach the file API anyway, so a
			// flush still in the air is let go rather than waited out
			for (const requestId of [...pendingFlushes.keys()]) {
				settleFlush(requestId);
			}
			// Cut without waiting for the closing handshake. The decision to tear down
			// is already made, so there is no point being held up by the other end (a
			// window that has already closed, or a tab that does not respond)
			for (const socket of sockets) {
				socket.terminate();
			}
			sockets.clear();
			await new Promise<void>((resolve) => {
				webSocketServer.close(() => {
					resolve();
				});
			});
			await new Promise<void>((resolve) => {
				server.close(() => {
					resolve();
				});
				// close() does not return until the connections still up are cut. The
				// browser holds keep-alive open, so waiting means never tearing down
				server.closeAllConnections();
			});
		},
	};
}
