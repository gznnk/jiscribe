// A local host that shows the diagram the AI drew, on the spot, and lets a person
// fix it there. It brings up HTTP + WebSocket inside the MCP process and opens the
// viewer in a browser.
//
// This file is where the parts are wired together and nothing else lives:
//
// - listenOnAvailablePort: the port the HTTP server ends up on
// - viewerRegistry: the windows connected, and the host's lifetime hanging off them
// - fileMirror: the file on display, watched outwards and written back inwards
// - viewerRequestBroker: the requestId round trips, one broker per kind of question
// - headlessLauncher: the window-less browser the AI looks through
//
// The single source of truth is one .jis file in the workspace. Only the queries
// the file has no answer for (capture, camera, selection, measurement) are put to
// the windows under a requestId (runHandleOp); the one other round trip is the
// flush the windows are asked for before the file on display changes (flushViewers).
//
// The window is either one a person looks at or a headless one the AI looks
// through. Both are viewers as far as everything here is concerned; where they
// differ is that a headless one has nobody to close it, so closing goes through the
// closeViewer frame rather than the browser's window.

import { randomUUID } from "node:crypto";
import path from "node:path";

import { WebSocketServer } from "ws";

import type {
	CanvasHost,
	CanvasHostOptions,
	HandleOpOutcome,
} from "./canvasHostTypes";
import { createFileMirror } from "./fileMirror";
import { createHeadlessLauncher } from "./headlessLauncher";
import { createViewerHttpServer } from "./httpServer";
import { listenOnAvailablePort } from "./listenOnAvailablePort";
import { openBrowser } from "./openBrowser";
import { isAllowedHostHeader, isAllowedOrigin } from "./requestGuards";
import { resolveViewerAssets } from "./viewerAssets";
import { createViewerRegistry } from "./viewerRegistry";
import { createViewerRequestBroker } from "./viewerRequestBroker";
import {
	isHeadlessViewerSearch,
	isCanvasHostClientMessage,
} from "../shared/canvasHostProtocol";
import {
	MAX_WRITE_BODY_BYTES,
	SESSION_TOKEN_QUERY_PARAM,
} from "../shared/fileApiRoute";

export type {
	CanvasHost,
	CanvasHostOptions,
	HandleOpOutcome,
	HeadlessViewerOutcome,
	ViewerCloseOutcome,
} from "./canvasHostTypes";

/** The port tried first. Kept apart from studio's 5180 */
const DEFAULT_PORT = 5190;

/**
 * How long to wait before giving up on the viewer answering a handleOpRequest. The
 * answer comes back even while a person is mid-drag, so the only thing this catches
 * is a frozen tab
 */
const HANDLE_OP_TIMEOUT_MS = 15_000;

/**
 * How long openFile waits for the windows to write out the edits they have
 * buffered before it moves to another file. A window answers after one write round
 * trip (plus one already in flight); the rest is room, since running out costs a
 * person's last edit while waiting only holds up a file switch
 */
export const FLUSH_EDITS_TIMEOUT_MS = 3_000;

/**
 * Whether a window may be put on the user's screen. `JISCRIBE_MCP_NO_OPEN` is the
 * escape hatch for a machine with no browser; it is read on every open rather than
 * once at startup, so it holds wherever the call comes from
 */
export const isBrowserOpeningAllowed = (): boolean =>
	(process.env.JISCRIBE_MCP_NO_OPEN ?? "") === "";

/**
 * Reads the session token off a WebSocket URL.
 *
 * @param requestUrl The upgrade request's target, which carries no origin
 * @returns The token as written, or null when the URL carries none
 */
const readSessionTokenQuery = (requestUrl: string | undefined): string | null =>
	new URLSearchParams(readSearch(requestUrl)).get(SESSION_TOKEN_QUERY_PARAM);

/**
 * The query of a request target, without its `?`. Done by hand rather than with
 * URL, which throws on a target it cannot parse
 *
 * @param requestUrl The upgrade request's target, or undefined when it has none
 */
const readSearch = (requestUrl: string | undefined): string => {
	const url = requestUrl ?? "";
	const queryIndex = url.indexOf("?");
	return queryIndex < 0 ? "" : url.slice(queryIndex + 1);
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
			fileMirror.writeOpenFile(relPath, body, ifMatch),
	});
	const port = await listenOnAvailablePort(
		server,
		options.port ?? DEFAULT_PORT,
	);
	// The address it binds, rather than a name: a machine that resolves localhost to
	// ::1 first would otherwise be sent to whatever listens on that port there
	const url = `http://127.0.0.1:${port}`;

	let isClosed = false;
	const viewerRegistry = createViewerRegistry({
		onViewersGone: options.onViewersGone,
		idleShutdownDelayMs: options.idleShutdownDelayMs,
		isHostClosed: () => isClosed,
	});

	const webSocketServer = new WebSocketServer({
		server,
		path: "/ws",
		// ws would otherwise take 100MB from any page on this machine before looking
		maxPayload: MAX_WRITE_BODY_BYTES,
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

	const handleOpBroker = createViewerRequestBroker<HandleOpOutcome>();
	const flushBroker = createViewerRequestBroker<void>();

	/**
	 * Asks every open window to write out what it is holding, and waits for the
	 * answers.
	 *
	 * @param timeoutMs How long to wait before going on without the windows that
	 *   stayed silent
	 */
	const flushViewers = async (timeoutMs: number): Promise<void> => {
		const askedSockets = viewerRegistry.openSockets();
		if (askedSockets.length === 0) {
			return;
		}
		await flushBroker.ask({
			askedSockets,
			calcFrame: (requestId) => ({ type: "flushEdits", requestId }),
			timeoutMs,
			calcTimeoutOutcome: () => undefined,
			calcAllDoneOutcome: () => undefined,
		});
	};

	const fileMirror = createFileMirror({
		workspaceRoot,
		broadcast: viewerRegistry.broadcast,
		withFileLock: options.withFileLock,
		flushEdits: () =>
			flushViewers(options.flushEditsTimeoutMs ?? FLUSH_EDITS_TIMEOUT_MS),
	});

	webSocketServer.on("connection", (socket, request) => {
		viewerRegistry.register(
			socket,
			isHeadlessViewerSearch(readSearch(request.url)),
		);
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
				handleOpBroker.answer(frame.requestId, socket, {
					ok: frame.ok,
					text: frame.text,
					...(frame.imagePngBase64 === undefined
						? {}
						: { imagePngBase64: frame.imagePngBase64 }),
				});
				return;
			}
			flushBroker.answer(frame.requestId, socket);
		});
		socket.on("close", () => {
			viewerRegistry.unregister(socket);
			// A window that left wrote out what it could on its way (beforeunload), and
			// there is nothing more to wait for either way
			flushBroker.dropSocket(socket);
			handleOpBroker.dropSocket(socket);
		});
		// The order connections arrive in does not matter: if a file to open is
		// already chosen, send it right away
		const openingMessage = fileMirror.calcOpenCanvasMessage();
		if (openingMessage !== null) {
			socket.send(JSON.stringify(openingMessage));
		}
	});

	const launchBrowser = options.launchBrowser ?? openBrowser;
	const headlessLauncher = createHeadlessLauncher({
		url,
		launchBrowser,
		viewerRegistry,
		isHostClosed: () => isClosed,
		connectTimeoutMs: options.headlessConnectTimeoutMs,
	});

	// shouldOpenBrowser is about this moment alone: a host started for a headless
	// window puts nothing up now, and still opens one later if asked
	if (options.shouldOpenBrowser ?? isBrowserOpeningAllowed()) {
		launchBrowser(url, {});
	}

	return {
		url,
		workspaceRoot,
		openFile: fileMirror.openFile,
		getOpenPath: fileMirror.getOpenPath,
		flushViewers,
		runHandleOp: async (op) => {
			// Ask every open tab and take the first answer.
			//
			// Not narrowing it to one, because the socket on the other end is not
			// necessarily "the screen being looked at". The viewer reconnects on its
			// own once cut off, so a tab left open and forgotten in an earlier session
			// joins the new host later. Such a tab may be an old build that does not
			// know handleOpRequest, and asking only that one times out silently.
			const askedSockets = viewerRegistry.openSockets();
			if (askedSockets.length === 0) {
				return {
					ok: false,
					text: "no canvas viewer is connected, so there is nothing on screen to capture, move, select, or measure; open one with open_canvas and keep the browser tab open",
				};
			}
			return await handleOpBroker.ask({
				askedSockets,
				calcFrame: (requestId) => ({
					type: "handleOpRequest",
					requestId,
					op,
				}),
				timeoutMs: HANDLE_OP_TIMEOUT_MS,
				calcTimeoutOutcome: () => ({
					ok: false,
					text: "the canvas viewer did not answer in time",
				}),
				calcAllDoneOutcome: () => ({
					ok: false,
					text: "the canvas viewer was closed before it could answer",
				}),
			});
		},
		closeViewers: () =>
			viewerRegistry.closeSockets(viewerRegistry.openSockets()),
		hasVisibleViewer: viewerRegistry.hasVisibleViewer,
		openVisibleViewer: () => {
			if (!isBrowserOpeningAllowed()) {
				return;
			}
			launchBrowser(url, {});
		},
		openHeadlessViewer: headlessLauncher.open,
		waitForViewer: viewerRegistry.waitForViewer,
		hasHeadlessViewer: viewerRegistry.hasHeadlessViewer,
		close: async () => {
			if (isClosed) {
				return;
			}
			// Marked closed before anything is awaited, so a second call on the way
			// in leaves at the guard above
			isClosed = true;
			viewerRegistry.settleViewerWaiters(false);
			// Only the headless windows are asked to close: a person's window is left
			// to reconnect to the next host, which a workspace switch relies on. The
			// kill comes before any wait, since the process is ended outright shortly
			// after the waits are due (FORCED_EXIT_DELAY_MS in index.ts); the frame
			// still goes out because a Windows-side browser launched from WSL outlives
			// the kill (it only takes the interop proxy)
			if (headlessLauncher.killBrowser()) {
				await viewerRegistry.closeSockets(viewerRegistry.openHeadlessSockets());
			}
			viewerRegistry.cancelIdleShutdown();
			fileMirror.stopWatching();
			handleOpBroker.settleAll({
				ok: false,
				text: "the canvas host was shut down before the viewer answered",
			});
			// Nothing written after this point would reach the file API anyway, so a
			// flush still in the air is let go rather than waited out
			flushBroker.settleAll(undefined);
			// Cut without waiting for the closing handshake. The decision to tear down
			// is already made, so there is no point being held up by the other end (a
			// window that has already closed, or a tab that does not respond)
			viewerRegistry.terminateAll();
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
