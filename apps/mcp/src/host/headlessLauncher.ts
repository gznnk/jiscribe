// The window-less browser the AI looks through, when nobody has a canvas open.
//
// It is a viewer like any other as far as the rest of the host is concerned: the
// page connects over the same WebSocket, carrying the query that marks it as one
// nobody can see. What is kept here is the launch itself — the process, so that a
// browser handed over after the host folded up can still be killed, and the open
// still running, so that two calls arriving together do not put up a Chromium each.

import type { ChildProcess } from "node:child_process";

import type { HeadlessViewerOutcome } from "./canvasHostTypes";
import type { BrowserOpenOptions } from "./openBrowser";
import type { ViewerRegistry } from "./viewerRegistry";
import { HEADLESS_VIEWER_QUERY } from "../shared/canvasHostProtocol";

/**
 * How long to wait for a headless window to connect back after it was spawned. A
 * Chromium starting cold has to come up before its page can reach the WebSocket,
 * so this is generous; nothing waits this long unless the browser never arrives
 */
const HEADLESS_CONNECT_TIMEOUT_MS = 20_000;

export type HeadlessLauncherOptions = {
	/** The viewer's URL. The query marking the window as unseen is added here */
	url: string;
	/** What launches the browser (openBrowser, or a test's stand-in) */
	launchBrowser: (url: string, browserOptions: BrowserOpenOptions) => void;
	/** The windows already connected, and the wait for one to arrive */
	viewerRegistry: ViewerRegistry;
	/**
	 * Whether the host has been torn down. A window opened onto a host that is
	 * gone has nothing to connect to
	 */
	isHostClosed: () => boolean;
	/**
	 * How long to wait for the window it spawned to connect (milliseconds, default
	 * 20000). Shortening it only makes sense where no browser is going to arrive at
	 * all (tests)
	 */
	connectTimeoutMs?: number;
};

export type HeadlessLauncher = {
	/**
	 * Opens one window-less browser and waits until its page has connected. A
	 * second call while one is still opening joins it rather than spawning a
	 * browser of its own.
	 *
	 * @returns Whether there is now an eye on the canvas. With a viewer already
	 *   connected, nothing is opened and it reports didOpenWindow: false
	 */
	open: () => Promise<HeadlessViewerOutcome>;
	/**
	 * Kills the browser this host spawned, if it still holds one. It is a last
	 * resort: the way a window is actually closed is the closeViewer frame, which
	 * is all that reaches a Windows-side browser launched from WSL.
	 *
	 * @returns Whether there was a browser to kill, which is also whether any
	 *   window of ours is worth asking to close
	 */
	killBrowser: () => boolean;
};

/**
 * Creates the launcher for the AI's own window.
 *
 * @param options What to open, who is already watching, and whether the host is
 *   still there to be connected to
 */
export const createHeadlessLauncher = (
	options: HeadlessLauncherOptions,
): HeadlessLauncher => {
	const { viewerRegistry } = options;

	/** The headless browser this host spawned, while it is still ours to kill */
	let browserProcess: ChildProcess | null = null;

	/**
	 * The open still running, so a second call joins it instead of spawning a
	 * Chromium of its own: both would pass the "nobody is connected" test, and only
	 * the last child handed over would be remembered to be killed
	 */
	let opening: Promise<HeadlessViewerOutcome> | null = null;

	const runOpen = async (): Promise<HeadlessViewerOutcome> => {
		if (options.isHostClosed()) {
			return { ok: false, reason: "the canvas host is already shut down" };
		}
		if (viewerRegistry.countOpenSockets() > 0) {
			return { ok: true, didOpenWindow: false };
		}
		let launchFailure: string | null = null;
		options.launchBrowser(`${options.url}?${HEADLESS_VIEWER_QUERY}`, {
			mode: "headless",
			onSpawn: (child) => {
				// The host can be folded up while the browser is still coming up.
				// Holding on to a process the closed host will never kill would
				// leave a window-less Chromium behind for good
				if (options.isHostClosed()) {
					child.kill();
					return;
				}
				browserProcess = child;
			},
			onFailure: (reason) => {
				launchFailure = reason;
				// Nothing is coming, so the wait below is not left to run its
				// full course. open_canvas waits on the same waiters after a
				// workspace switch, but the tool layer runs opens one at a time, so
				// no wait of its own is in the air alongside this one
				viewerRegistry.settleViewerWaiters(false);
			},
		});
		// Having no candidate at all is known before any of them is spawned, so
		// there is nothing to wait for
		if (launchFailure !== null) {
			return { ok: false, reason: launchFailure };
		}
		const isConnected = await viewerRegistry.waitForViewer(
			options.connectTimeoutMs ?? HEADLESS_CONNECT_TIMEOUT_MS,
		);
		if (isConnected) {
			return { ok: true, didOpenWindow: true };
		}
		return {
			ok: false,
			reason:
				launchFailure ??
				"a headless browser was started but its page never connected back",
		};
	};

	return {
		open: () => {
			if (opening !== null) {
				return opening;
			}
			const running = runOpen().finally(() => {
				if (opening === running) {
					opening = null;
				}
			});
			opening = running;
			return running;
		},
		killBrowser: () => {
			if (browserProcess === null) {
				return false;
			}
			browserProcess.kill();
			browserProcess = null;
			return true;
		},
	};
};
