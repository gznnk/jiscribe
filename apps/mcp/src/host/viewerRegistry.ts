// The windows connected to this host: which of them are open, which nobody can see,
// and what follows from there being none left.
//
// Every walk over the set filters on the connection still being up, because a
// socket stays in it until its close event arrives. That one test is isSocketOpen,
// and nothing here reads readyState anywhere else.
//
// The host's lifetime hangs off this too. The last window leaving starts the grace
// period after which onViewersGone is called, and a window arriving cancels it —
// which is why a browser that was merely put to sleep in the background does not
// cost the AI its canvas.

import type { WebSocket } from "ws";

import type { ViewerCloseOutcome } from "./canvasHostTypes";
import type { CanvasHostServerMessage } from "../shared/canvasHostProtocol";

/**
 * How long to wait, after sending closeViewer, before judging whether the window
 * closed. The viewer writes out the edits it has buffered before closing, so this
 * allows for that one round trip
 */
const VIEWER_CLOSE_TIMEOUT_MS = 5_000;

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

/** Whether this connection is up. A socket is registered until its close arrives */
const isSocketOpen = (socket: WebSocket): boolean =>
	socket.readyState === socket.OPEN;

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
		let pendingCount = sockets.filter(isSocketOpen).length;
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

export type ViewerRegistryOptions = {
	/**
	 * Called once every viewer that was connected has left and none has come back
	 * within the grace period (see CanvasHostOptions.onViewersGone). Left out,
	 * nothing is ever timed
	 */
	onViewersGone?: () => void;
	/**
	 * The grace period between the last viewer leaving and onViewersGone being
	 * called (milliseconds, default one hour)
	 */
	idleShutdownDelayMs?: number;
	/**
	 * Whether the host has been torn down. A wait started after that point is not
	 * worth taking, and a shutdown timer fired after it has nothing left to report
	 */
	isHostClosed: () => boolean;
};

export type ViewerRegistry = {
	/**
	 * Takes in a connection that has just arrived, which cancels any pending idle
	 * shutdown and ends the waits for a viewer.
	 *
	 * @param socket The connection, taken as open
	 * @param isHeadless Whether the page behind it is one nobody can see (the AI's
	 *   eye), told by the query it carries
	 */
	register: (socket: WebSocket, isHeadless: boolean) => void;
	/**
	 * Forgets a connection that has closed, and starts the grace period when it was
	 * the last one.
	 *
	 * @param socket The connection that went away
	 */
	unregister: (socket: WebSocket) => void;
	/** The connections that are up, in the order they connected */
	openSockets: () => WebSocket[];
	/** The open connections belonging to a window nobody can see */
	openHeadlessSockets: () => WebSocket[];
	/** How many windows are connected, visible or not */
	countOpenSockets: () => number;
	/** Whether a window a person can see is connected */
	hasVisibleViewer: () => boolean;
	/** Whether a window nobody can see is connected */
	hasHeadlessViewer: () => boolean;
	/**
	 * Waits for a viewer to be connected.
	 *
	 * @param timeoutMs How long to wait (milliseconds). It returns straight away
	 *   when one is connected already, and when the host is already closed
	 * @returns Whether a viewer is connected
	 */
	waitForViewer: (timeoutMs: number) => Promise<boolean>;
	/**
	 * Ends every wait for a viewer at once, whatever it was waiting for.
	 *
	 * @param isConnected What the waits are told: true from a connection arriving,
	 *   false from the host closing or a launch that will never arrive
	 */
	settleViewerWaiters: (isConnected: boolean) => void;
	/** Calls off the grace period, leaving onViewersGone unsaid */
	cancelIdleShutdown: () => void;
	/**
	 * Sends one frame to every open window.
	 *
	 * @param message The frame, serialised once for all of them
	 */
	broadcast: (message: CanvasHostServerMessage) => void;
	/**
	 * Asks the given windows to close and waits for them to go.
	 *
	 * @param targets The windows asked, which are expected to be open. An empty list
	 *   returns straight away without a frame going out
	 * @returns How many went and how many are still there after the wait
	 */
	closeSockets: (targets: readonly WebSocket[]) => Promise<ViewerCloseOutcome>;
	/**
	 * Cuts every connection without waiting for the closing handshake, and forgets
	 * them all. For a teardown that is already decided on
	 */
	terminateAll: () => void;
};

/**
 * Creates the registry of connected viewer windows.
 *
 * @param options What to do when the windows run out, and how to tell whether the
 *   host is still there to do it
 */
export const createViewerRegistry = (
	options: ViewerRegistryOptions,
): ViewerRegistry => {
	const sockets = new Set<WebSocket>();

	/**
	 * The sockets belonging to a headless window. A window a person can see is the
	 * one that has to be there before open_canvas can say the canvas is on screen,
	 * so the two are told apart by the query the page carries (see the viewer's App)
	 */
	const headlessSockets = new WeakSet<WebSocket>();

	// Tearing down before anything has ever connected leaves a browser that is still
	// starting up with nowhere to connect to
	let hasEverConnected = false;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;

	/** Callers of waitForViewer, each settling its own wait */
	const viewerWaiters = new Set<(isConnected: boolean) => void>();

	const openSockets = (): WebSocket[] => [...sockets].filter(isSocketOpen);

	const openHeadlessSockets = (): WebSocket[] =>
		openSockets().filter((socket) => headlessSockets.has(socket));

	const settleViewerWaiters = (isConnected: boolean): void => {
		for (const settle of [...viewerWaiters]) {
			settle(isConnected);
		}
	};

	const cancelIdleShutdown = (): void => {
		if (idleTimer !== null) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	};

	const scheduleIdleShutdown = (): void => {
		if (
			options.onViewersGone === undefined ||
			!hasEverConnected ||
			options.isHostClosed()
		) {
			return;
		}
		cancelIdleShutdown();
		idleTimer = setTimeout(() => {
			idleTimer = null;
			if (sockets.size === 0 && !options.isHostClosed()) {
				options.onViewersGone?.();
			}
		}, options.idleShutdownDelayMs ?? IDLE_SHUTDOWN_DELAY_MS);
	};

	return {
		register: (socket, isHeadless) => {
			sockets.add(socket);
			if (isHeadless) {
				headlessSockets.add(socket);
			}
			hasEverConnected = true;
			cancelIdleShutdown();
			settleViewerWaiters(true);
		},
		unregister: (socket) => {
			sockets.delete(socket);
			if (sockets.size === 0) {
				scheduleIdleShutdown();
			}
		},
		openSockets,
		openHeadlessSockets,
		countOpenSockets: () => openSockets().length,
		hasVisibleViewer: () =>
			openSockets().some((socket) => !headlessSockets.has(socket)),
		hasHeadlessViewer: () => openHeadlessSockets().length > 0,
		waitForViewer: async (timeoutMs) => {
			if (openSockets().length > 0) {
				return true;
			}
			if (options.isHostClosed()) {
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
		},
		settleViewerWaiters,
		cancelIdleShutdown,
		broadcast: (message) => {
			const frame = JSON.stringify(message);
			for (const socket of openSockets()) {
				socket.send(frame);
			}
		},
		closeSockets: async (targets) => {
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
			const remainingCount = targets.filter(isSocketOpen).length;
			return {
				closedCount: targets.length - remainingCount,
				remainingCount,
			};
		},
		terminateAll: () => {
			for (const socket of sockets) {
				socket.terminate();
			}
			sockets.clear();
		},
	};
};
