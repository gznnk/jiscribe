// What the canvas host is, seen from outside: the object startCanvasHost returns,
// the settings it takes, and the results of the three calls that can fail on their
// own terms rather than by throwing.
//
// They sit apart from canvasHost itself because the parts it is composed of return
// them (headlessLauncher, viewerRegistry), and importing them back out of the
// composition root would make a cycle of it.

import type { BrowserOpenOptions } from "./openBrowser";
import type { ViewerOp } from "../shared/canvasHostProtocol";
import type { HostActionName } from "../shared/hostActionsRoute";

/** The answer to a handleOpRequest, in the shape the AI is handed it */
export type HandleOpOutcome = {
	ok: boolean;
	/** The body returned to the AI. On failure, the reason itself */
	text: string;
	/** The PNG (base64), present only for capture_canvas */
	imagePngBase64?: string;
	/** The exported file's bytes (base64), present only for a successful exportImage */
	exportedImageBase64?: string;
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
	 * is set. Nothing in the server reads it: the desktop app joins it to
	 * workspaceRoot to record the canvas on display (when it quits and after an
	 * Open…), and the tests have no other way of telling which file a switch
	 * settled on
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
	 * camera, selection, measurement). The file on display is read first and sent
	 * on if it changed, and the window answers only once it has drawn that text,
	 * so a write that has landed is what the answer sees. A write still being made
	 * is the caller's to wait out.
	 *
	 * @param op The operation to run: an ai-tools screen op, or export_image's
	 *   own exportImage
	 * @param timeoutMs How long to wait for a window's answer (milliseconds);
	 *   omitted, HANDLE_OP_TIMEOUT_MS (15 s). The wait for the revision to be
	 *   drawn is the window's and comes out of this
	 * @returns A result that can be handed to the AI as it is. Even when no viewer
	 *   is connected, none answers, or the file on display cannot be read, it
	 *   returns ok=false rather than throwing (all the AI needs is a readable
	 *   reason)
	 */
	runHandleOp: (op: ViewerOp, timeoutMs?: number) => Promise<HandleOpOutcome>;
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
	 * Waits for a viewer to be connected. open_canvas uses it to give a window from
	 * a host it has just replaced the chance to find its way back before a second
	 * one is put up.
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

/**
 * What the owner of a host hands it: a callback per action it offers. An action
 * left out is not offered, and a request for it is answered 404. A callback may
 * be asynchronous; the request is answered once it settles (a throw is answered
 * as an error status, see handleHostAction).
 *
 * The viewer flushes nothing before asking, so a callback that ends the process
 * has to call the host's `flushViewers` first, or an edit still on a window's
 * save debounce goes with the window (the desktop app does so in `before-quit`).
 * One that switches files through `runtime.openCanvas` is flushed by it, but has
 * to settle before the switch tears the host down: a file in another directory
 * closes the host the request came in on, and the request with it, so the
 * callback starts that switch only after it has settled (the desktop app's
 * `openFile` returns once the dialog closes and runs the open detached)
 */
export type HostActions = Partial<
	Record<HostActionName, () => void | Promise<void>>
>;

export type CanvasHostOptions = {
	/** The directory the file API is relative to (absolute path) */
	workspaceRoot: string;
	/** The port tried first (DEFAULT_PORT when omitted). While it is taken, steps one port up */
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
	 * called (milliseconds; the default is IDLE_SHUTDOWN_DELAY_MS, an hour). It covers a window a browser put to
	 * sleep in the background, which reconnects only when a person returns to it,
	 * so shorten it only when there is a reason not to wait (tests)
	 */
	idleShutdownDelayMs?: number;
	/**
	 * How long openFile waits for the windows to write out their buffered edits
	 * before it switches file (milliseconds; the default is FLUSH_EDITS_TIMEOUT_MS). Shortening it only makes
	 * sense where no window is going to answer at all (tests)
	 */
	flushEditsTimeoutMs?: number;
	/**
	 * How long openHeadlessViewer waits for the window it spawned to connect
	 * (milliseconds; the default is HEADLESS_CONNECT_TIMEOUT_MS). Shortening it only makes sense where no
	 * browser is going to arrive at all (tests)
	 */
	headlessConnectTimeoutMs?: number;
	/**
	 * Runs one file's task with the tasks queued ahead of it for that file, so a
	 * write from the viewer and a rewrite from an AI tool never overlap. The MCP
	 * server passes the path lock every tool goes through; a host started with a
	 * lock of its own would let the two land on top of each other
	 *
	 * @param filePath The file the task touches (absolute path, as the tools
	 *   resolve it — the lock is keyed on it)
	 * @param task What to run once the file is free
	 */
	withFileLock: <T>(filePath: string, task: () => Promise<T>) => Promise<T>;
	/**
	 * What puts a viewer window up; openBrowser when omitted. A host embedded in
	 * an app passes one that opens the app's own window, and a test one that
	 * records the URL. A window nobody sees is asked for with mode `"headless"`
	 * and a URL carrying the headless query
	 */
	launchBrowser?: (url: string, browserOptions: BrowserOpenOptions) => void;
	/**
	 * What the viewer's own menu may ask the process owning this host to do, a
	 * callback per action (see HostActions): the desktop app offers its file open
	 * dialog and quitting. Omitted, nothing is offered and the viewer draws no
	 * such menu, which is the stdio server's case: it owns no window to put a
	 * dialog on, and its client, not a menu, ends it
	 */
	hostActions?: HostActions;
};

/** What became of a write the viewer sent (see the file mirror's writeOpenFile) */
export type WriteOpenFileOutcome =
	/** It landed, and this is the revision of what is now on disk */
	| { kind: "written"; revision: string }
	/** The path named is not the file on display, so nothing was written */
	| { kind: "not-open" }
	/**
	 * The file no longer holds the revision the write names, so nothing was
	 * written; the revision carried here is the one it holds now, and the text
	 * behind it has gone to the windows as a docChanged frame
	 */
	| { kind: "revision-mismatch"; revision: string }
	/**
	 * The file held the revision the write names, but kept being rewritten under
	 * it for longer than the write waits, so nothing was written. Sent again, the
	 * same write may land
	 */
	| { kind: "file-unsettled" }
	/** The body is not a document the tools could load, so nothing was written */
	| { kind: "invalid-doc"; message: string };
