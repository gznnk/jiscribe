// A local host that shows the diagram the AI drew, on the spot, and lets a person
// fix it there. It brings up HTTP + WebSocket inside the MCP process and opens the
// viewer in a browser.
//
// The single source of truth is one .jis.json file in the workspace. The AI
// rewrites it through the path-based tools (add_rect and the rest), and the host
// watches the file and mirrors it into the viewer. A fix a person makes in the
// viewer is saved back, so the next time the AI reads the file it gets the shape
// the person left it in.
//
// Only the queries the file has no answer for (capture, camera, selection,
// measurement) are put to the viewer under a requestId (runHandleOp).
//
// The window is either one a person looks at or a headless one the AI looks
// through (openHeadlessViewer). Both are viewers as far as everything here is
// concerned; where they differ is that a headless one has nobody to close it, so
// closing goes through the closeViewer frame rather than the browser's window.

import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unwatchFile, watchFile } from "node:fs";
import { readFile } from "node:fs/promises";
import type http from "node:http";
import path from "node:path";

import type { AiHandleOp } from "@jiscribe/ai-tools";
import { WebSocketServer, type WebSocket } from "ws";

import { CanvasHostError } from "./canvasHostError";
import { createViewerHttpServer } from "./httpServer";
import { openBrowser } from "./openBrowser";
import type { BrowserOpenOptions } from "./openBrowser";
import { resolveViewerAssets } from "./viewerAssets";
import {
	HEADLESS_VIEWER_QUERY,
	isCanvasHostClientMessage,
	type CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";

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
 * The grace period between the last viewer leaving and onViewersGone being called.
 * It is there so a momentary disconnect on reload does not tear the host down, and
 * it is a few times the viewer's reconnect interval (which starts at 1 second)
 */
const IDLE_SHUTDOWN_DELAY_MS = 5_000;

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
	 * none connected, the next viewer to connect opens it
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
	 * called (milliseconds, default 5000). It is there so a momentary disconnect on
	 * reload does not tear the host down, so shorten it only when there is a reason
	 * not to wait (tests)
	 */
	idleShutdownDelayMs?: number;
	/**
	 * How long openHeadlessViewer waits for the window it spawned to connect
	 * (milliseconds, default 20000). Shortening it only makes sense where no
	 * browser is going to arrive at all (tests)
	 */
	headlessConnectTimeoutMs?: number;
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
	const server = createViewerHttpServer({
		workspaceRoot,
		viewerHtml,
		assetRootPath,
	});
	const port = await listenOnAvailablePort(
		server,
		options.port ?? DEFAULT_PORT,
	);
	const url = `http://localhost:${port}`;

	let isClosed = false;
	const sockets = new Set<WebSocket>();
	const webSocketServer = new WebSocketServer({ server, path: "/ws" });

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

	// The file on display, and the text last handed out as its content. Kept so that
	// nothing is said when the change the watcher picked up is our own write (or a
	// person's save) coming back
	let openPath: string | null = null;
	let lastKnownText: string | null = null;
	let watchedFile: string | null = null;

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
				lastKnownText = text;
				broadcast({ type: "docChanged", relPath, docText: text });
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
			// Record a person's save as the latest text we know of, stopping the watch
			// from echoing it back to us
			if (frame.relPath === openPath) {
				lastKnownText = frame.docText;
			}
		});
		socket.on("close", () => {
			sockets.delete(socket);
			if (sockets.size === 0) {
				scheduleIdleShutdown();
			}
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
		if (openPath !== null && lastKnownText !== null) {
			socket.send(
				JSON.stringify({
					type: "openCanvas",
					relPath: openPath,
					docText: lastKnownText,
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
		waitForViewer,
		hasVisibleViewer,
		openVisibleViewer,
		hasHeadlessViewer,
		openHeadlessViewer: async () => {
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
		},
		openFile: async (relPath) => {
			openPath = relPath;
			const text = await readOpenFileText(relPath);
			lastKnownText = text;
			startWatching(relPath);
			if (text !== null) {
				broadcast({ type: "openCanvas", relPath, docText: text });
			}
		},
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
				await closeSockets(
					openSockets().filter((socket) => headlessSockets.has(socket)),
				);
				// Killing the child reaches the browser only when it is a local one.
				// A Windows-side .exe spawned from WSL is reached through an interop
				// proxy, and the kill takes the proxy while the browser lives on, so
				// this is the lucky case rather than the plan
				browserProcess.kill();
			}
			cancelIdleShutdown();
			stopWatching();
			for (const requestId of [...pendingHandleOps.keys()]) {
				settleHandleOp(requestId, {
					ok: false,
					text: "the canvas host was shut down before the viewer answered",
				});
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
