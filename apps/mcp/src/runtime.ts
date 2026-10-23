// What every MCP session of one process shares: the canvas host, the locks the
// tools and a person's saves queue on, the barrier the screen tools wait behind,
// and the undo history. A server built per client session reads all of it from
// here, so two sessions never start a host each or undo each other's history
// from separate copies.

import { basename, dirname } from "node:path";

import type { AiCanvasOpOutcome, AiDocOp } from "@jiscribe/ai-tools";
import {
	applyCanvasOp,
	createCanvasOpHistory,
	type CanvasOpHistory,
} from "@jiscribe/ai-tools/apply";
import type { CanvasDoc } from "@jiscribe/doc";

import { createCallBarrier } from "./callBarrier";
import { canvasToolSet, docOps } from "./canvasDefinitions";
import { createCanvasFileLock, type CanvasFileLock } from "./canvasFileLock";
import {
	ensureCanvasFile,
	loadCanvasFile,
	saveCanvasFile,
} from "./canvasStore";
import {
	FLUSH_EDITS_TIMEOUT_MS,
	isBrowserOpeningAllowed,
	startCanvasHost,
	type CanvasHost,
} from "./host/canvasHost";
import { openBrowser, type BrowserOpenOptions } from "./host/openBrowser";
import { createPathLock } from "./pathLock";

/**
 * The lock key `open_canvas` and `close_canvas` share. Both swap the one host
 * the runtime holds, so they are let through one at a time; a NUL byte cannot
 * appear in a file name, so this key can never queue behind a real file.
 */
const HOST_LOCK_KEY = "\0canvas-host";

/**
 * How long a host started in place of one that was serving another directory
 * waits for the window the closed host had to reconnect, before putting a window
 * of its own up. The viewer's reconnect backoff starts at a second and the token
 * it fetches before connecting adds a round trip, so this leaves room for a
 * couple of attempts; overshooting only delays a window nobody has yet, while
 * cutting it short leaves a person with two.
 */
const RECONNECT_GRACE_MS = 4_000;

/**
 * How many files' undo histories are kept at once. The map is only ever added
 * to, so without a cap a long session holds every file it has touched; the
 * least recently used entry goes first.
 */
const MAX_HISTORY_FILES = 64;

export type JiscribeMcpRuntimeOptions = {
	/**
	 * What puts a viewer window up; the default is openBrowser, which spawns a
	 * Chromium. It is what the host's `launchBrowser` receives, so it is called
	 * for a visible window with `{}` and for one nobody sees with mode
	 * `"headless"` and a URL carrying `?headless=1`. `JISCRIBE_MCP_NO_OPEN` still
	 * holds back the visible ones before this is reached
	 */
	launchViewer?: (url: string, browserOptions: BrowserOpenOptions) => void;
	/**
	 * Called by a non-headless openCanvas that finds a visible viewer already
	 * connected and launches nothing, so the owner can bring its window to the
	 * front. Never called for a headless open
	 */
	raiseVisibleViewer?: () => void;
};

export type JiscribeMcpRuntime = {
	/**
	 * Does what the open_canvas tool does: creates the file if it is missing,
	 * starts or moves the host to the file's directory, shows the file, and puts
	 * a window up when none is there.
	 *
	 * @param path The file as the AI gave it; it has to be absolute and name a
	 *   canvas file, or a CanvasFileError is thrown
	 * @param options `headless: true` puts up a window nobody sees, unless a
	 *   viewer of either kind is already connected
	 * @returns The tool's reply. A canvas that opened but got no headless window
	 *   comes back as text starting with `error:` rather than as a throw
	 */
	openCanvas: (path: string, options: { headless: boolean }) => Promise<string>;
	/**
	 * Does what the close_canvas tool does: asks the windows to close and stops
	 * the host, unless a window refused to close.
	 *
	 * @returns The tool's reply; a window left open is reported as text starting
	 *   with `error:`, with the host left running
	 */
	closeCanvas: () => Promise<string>;
	/**
	 * Asks the viewers to close and folds the host up, whether or not they did.
	 * Calling it again, or with no host running, does nothing. The runtime stays
	 * usable: a later openCanvas starts a new host
	 */
	close: () => Promise<void>;
	/**
	 * Applies one document operation to one file under its lock, writing it back
	 * only when the operation changed the document and recording it for undo.
	 *
	 * @param path The file as the AI gave it, resolved by toCanvasFilePath
	 * @param op The operation; a read-only one leaves the file and the undo
	 *   history untouched
	 */
	applyDocOpToFile: (path: string, op: AiDocOp) => Promise<AiCanvasOpOutcome>;
	/** The gate every tool naming a canvas file goes through (see CanvasFileLock) */
	withCanvasFileLock: CanvasFileLock;
	/** The host running now, or null before openCanvas and after it is folded up */
	getHost: () => CanvasHost | null;
	/**
	 * Waits out every file or host call that started before this one was made. A
	 * screen tool calls it before its first await, so "before" is the order the
	 * calls were handed over in
	 */
	waitForEarlierCalls: () => Promise<void>;
};

/**
 * Create the state the tools of every MCP server in this process share.
 *
 * @param options How viewer windows are put up and brought forward. Omitted,
 *   windows are spawned browsers and nothing is raised
 * @returns A runtime with no host running; the first openCanvas starts one
 */
export function createJiscribeMcpRuntime(
	options: JiscribeMcpRuntimeOptions = {},
): JiscribeMcpRuntime {
	const launchViewer = options.launchViewer ?? openBrowser;

	// The viewer is started only when openCanvas is first called, and reused after
	// that. Its lifetime follows the windows: once the last one closes and none
	// comes back within the grace period it is folded up and the port given back
	let host: CanvasHost | null = null;

	// Let operations on the same file through one at a time. Being cut in on
	// between load → modify → write back makes the later write-back discard the
	// earlier change along with it
	const withPathLock = createPathLock();
	// What a screen tool waits out before it asks the viewer: every call that can
	// write a file, or switch or fold up the host, which had arrived ahead of it.
	// The file calls that only read are tracked along with the rest, since the
	// gate they share cannot tell the two apart
	const callBarrier = createCallBarrier();
	const withCanvasFileLockUntracked = createCanvasFileLock(withPathLock);
	// Every tool naming a canvas file goes through this, so the calls on one file
	// run in the order they arrived even though resolving the path is asynchronous
	const withCanvasFileLock: CanvasFileLock = (path, task) =>
		callBarrier.track(() => withCanvasFileLockUntracked(path, task));

	/**
	 * Start the host, arranging for it to be folded up once every window is closed.
	 *
	 * @param workspaceRoot The base directory of the file API (absolute path)
	 * @param shouldOpenBrowser false when the caller opens a headless window
	 *   itself. undefined leaves it to `JISCRIBE_MCP_NO_OPEN`, which is how a plain
	 *   open has always decided
	 * @returns The started host. It has nothing to show yet, so call openFile next
	 */
	const startHost = async (
		workspaceRoot: string,
		shouldOpenBrowser: boolean | undefined,
	): Promise<CanvasHost> => {
		const started: CanvasHost = await startCanvasHost({
			workspaceRoot,
			...(shouldOpenBrowser === undefined ? {} : { shouldOpenBrowser }),
			// A person's save goes through the gate the tools go through, so it never
			// lands in the middle of a tool's load → modify → write back
			withFileLock: withPathLock,
			launchBrowser: launchViewer,
			onViewersGone: () => {
				void (async () => {
					// If another host has already taken over, this one is done with and
					// has been folded up
					if (host !== started) {
						return;
					}
					host = null;
					await started.close();
				})();
			},
		});
		return started;
	};

	/**
	 * Let the calls that own the host through one at a time. `host ??= await
	 * startHost(...)` reads the variable before the await and assigns after it, so
	 * two calls arriving together would each start a host and one would be left
	 * running with nothing pointing at it.
	 */
	const withHostLock = <T>(task: () => Promise<T>): Promise<T> =>
		callBarrier.track(() => withPathLock(HOST_LOCK_KEY, task));

	// undo can only go back while things are "as the AI left them", so the history
	// is held per edited file
	const historyByPath = new Map<string, CanvasOpHistory>();
	const rememberHistory = (
		filePath: string,
		history: CanvasOpHistory,
	): void => {
		// Re-inserting puts it back at the end, which makes the Map's own order a
		// least-recently-used one
		historyByPath.delete(filePath);
		historyByPath.set(filePath, history);
		if (historyByPath.size > MAX_HISTORY_FILES) {
			const oldestPath = historyByPath.keys().next().value;
			if (oldestPath !== undefined) {
				historyByPath.delete(oldestPath);
			}
		}
	};

	const applyDocOpToFile = async (
		path: string,
		op: AiDocOp,
	): Promise<AiCanvasOpOutcome> => {
		return await withCanvasFileLock(path, async (filePath) => {
			const loaded = await loadCanvasFile(filePath);
			const loadedDoc = loaded.doc;
			let nextDoc: CanvasDoc | null = null;
			// A read leaves no step to take back, so it neither creates a history nor
			// counts as a use of one (which would push a real one out of the cap)
			const history = historyByPath.get(filePath) ?? createCanvasOpHistory();
			const outcome = applyCanvasOp(
				op,
				{
					getDoc: () => nextDoc ?? loadedDoc,
					replaceDoc: (replacement) => {
						nextDoc = replacement;
					},
				},
				history,
				docOps,
				canvasToolSet,
			);
			if (nextDoc !== null) {
				rememberHistory(filePath, history);
				try {
					await saveCanvasFile(filePath, nextDoc, loaded);
				} catch (error) {
					// The file still holds what it held, so the history is put back the
					// way it was. Left as it is, its newest entry would describe a
					// document nobody wrote, and every later undo would be refused as
					// someone else's work
					if (op.kind === "undo") {
						// undo took its entry out; nextDoc is what that entry held before,
						// and the file still holds what it recorded after
						history.push(nextDoc, loadedDoc);
					} else {
						history.pop(nextDoc);
					}
					throw error;
				}
			}
			return outcome;
		});
	};

	const openCanvas = (
		path: string,
		{ headless }: { headless: boolean },
	): Promise<string> =>
		withHostLock(async () => {
			const { filePath, isCreated } = await withCanvasFileLock(
				path,
				async (resolvedPath) => ({
					filePath: resolvedPath,
					isCreated: await ensureCanvasFile(resolvedPath),
				}),
			);
			// filePath is resolved through its links, so the key a person's save
			// locks on (this root joined with the file name) is the tools' key
			const workspaceRoot = dirname(filePath);

			// The file API cannot get outside the workspace, so being pointed at
			// another directory restarts the host on that directory (the viewer
			// reconnects on its own)
			let hadVisibleViewer = false;
			if (host !== null && host.workspaceRoot !== workspaceRoot) {
				// The window the old host had comes back to the port on its own,
				// so the host replacing it must not open one of its own before it
				// is clear that window is not returning
				hadVisibleViewer = host.hasVisibleViewer();
				// A save the window is still holding has nowhere to go once this
				// host is gone, so it is asked for before the teardown
				await host.flushViewers(FLUSH_EDITS_TIMEOUT_MS);
				await host.close();
				host = null;
			}
			// The environment variable that says not to open a window means "do
			// not put one up unasked", so an explicit headless request goes ahead
			const isReusedHost = host !== null;
			host ??= await startHost(
				workspaceRoot,
				headless || hadVisibleViewer ? false : undefined,
			);
			await host.openFile(basename(filePath));

			const state = isCreated ? "created and opened" : "opened";
			// The window the closed host had is given time to come back before
			// anything is opened in its place, visible or not. With no window
			// allowed on screen there is nothing to open instead, so nothing to
			// wait for
			const didWindowReturn =
				hadVisibleViewer && (headless || isBrowserOpeningAllowed())
					? await host.waitForViewer(RECONNECT_GRACE_MS)
					: false;
			if (!headless) {
				// A host kept alive by a headless window has nothing on screen, so
				// a plain open has to put a window up even though the host is
				// already running. A host started just above opened its own,
				// except where it was waiting for the window the closed host had
				if (hadVisibleViewer || isReusedHost) {
					if (host.hasVisibleViewer()) {
						options.raiseVisibleViewer?.();
					} else if (!hadVisibleViewer || !didWindowReturn) {
						host.openVisibleViewer();
					}
				}
				return `${state} ${basename(filePath)} — viewer: ${host.url}`;
			}
			const outcome = await host.openHeadlessViewer();
			if (!outcome.ok) {
				return `error: ${state} ${basename(filePath)}, but no headless viewer could be opened, so the tools that need a canvas on screen have nothing to work with: ${outcome.reason}`;
			}
			const openedIn = outcome.didOpenWindow
				? "a headless viewer (nothing is on the user's screen)"
				: "the viewer window already open";
			return `${state} ${basename(filePath)} in ${openedIn} — viewer: ${host.url}`;
		});

	const closeCanvas = (): Promise<string> =>
		withHostLock(async () => {
			if (host === null) {
				return "no canvas viewer is open";
			}
			const { closedCount, remainingCount } = await host.closeViewers();
			if (remainingCount > 0) {
				// Stopping the server while a window remains leaves that window
				// looking for somewhere to reconnect. It would join whichever host
				// takes this port next, so it is not stopped
				const advice = host.hasHeadlessViewer()
					? "a headless viewer cannot be closed by hand, so the port is held until this MCP session ends, which folds the server and lets that window close itself"
					: "close the window(s) by hand";
				return `error: ${remainingCount} viewer window(s) refused to close, so the local server is left running; ${advice}`;
			}
			await host.close();
			host = null;
			return closedCount === 0
				? "no viewer window was open; stopped the local server"
				: `closed ${closedCount} viewer window(s) and stopped the local server`;
		});

	const close = async (): Promise<void> => {
		const started = host;
		if (started === null) {
			return;
		}
		host = null;
		// Ask the windows to close before the connections are cut. A headless one
		// has no person to close it, and a window told nothing would only spend
		// its time looking for a host to reconnect to
		await started.closeViewers();
		await started.close();
	};

	return {
		openCanvas,
		closeCanvas,
		close,
		applyDocOpToFile,
		withCanvasFileLock,
		getHost: () => host,
		waitForEarlierCalls: callBarrier.waitForTrackedCalls,
	};
}
