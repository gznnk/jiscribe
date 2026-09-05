// Covers the part that matches the host's lifetime to the windows'. No browser
// is needed: a ws client is connected in place of a viewer, and only its answer
// to the closeViewer frame changes.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { startCanvasHost, type CanvasHost } from "../host/canvasHost";
import type { BrowserOpenOptions } from "../host/openBrowser";

/**
 * Where the ports these tests use start. If one is taken the host gives way
 * upward, one at a time
 */
const TEST_PORT = 5290;

/**
 * The grace period is 5 seconds by default; it is shortened here because the
 * shutdown itself is what we want to see
 */
const TEST_IDLE_DELAY_MS = 50;

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
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
});

afterAll(async () => {
	if (previousViewerRoot === undefined) {
		delete process.env.JISCRIBE_MCP_VIEWER_ROOT;
	} else {
		process.env.JISCRIBE_MCP_VIEWER_ROOT = previousViewerRoot;
	}
	await rm(viewerRoot, { recursive: true, force: true });
	await rm(workspaceRoot, { recursive: true, force: true });
});

afterEach(async () => {
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	for (const host of openHosts.splice(0)) {
		await host.close();
	}
});

const startTestHost = async (
	options: {
		onViewersGone?: () => void;
		headlessConnectTimeoutMs?: number;
		launchBrowser?: (url: string, browserOptions: BrowserOpenOptions) => void;
	} = {},
): Promise<CanvasHost> => {
	const host = await startCanvasHost({
		workspaceRoot,
		port: TEST_PORT,
		shouldOpenBrowser: false,
		idleShutdownDelayMs: TEST_IDLE_DELAY_MS,
		...options,
	});
	openHosts.push(host);
	return host;
};

/**
 * Stands in for the browser launch. No process is started: the URL the window
 * would have been given is recorded, and connecting a fake viewer is left to the
 * test
 */
const createBrowserLaunchRecorder = (
	onLaunch?: () => void,
): {
	launchedUrls: string[];
	launchBrowser: (url: string, browserOptions: BrowserOpenOptions) => void;
} => {
	const launchedUrls: string[] = [];
	return {
		launchedUrls,
		launchBrowser: (url) => {
			launchedUrls.push(url);
			onLaunch?.();
		},
	};
};

/**
 * Connects in place of a viewer. The caller decides what happens when
 * closeViewer arrives (closing the window = dropping the connection, not
 * closing it = doing nothing). `kind` picks which sort of window it stands for:
 * a headless one carries the same query the real page does.
 */
const connectFakeViewer = async (
	host: CanvasHost,
	onCloseRequest: (socket: WebSocket) => void,
	kind: "visible" | "headless" = "visible",
): Promise<WebSocket> => {
	const socket = new WebSocket(
		`${host.url.replace("http", "ws")}/ws${kind === "headless" ? "?headless=1" : ""}`,
	);
	openSockets.push(socket);
	socket.on("message", (data) => {
		const frame: unknown = JSON.parse(String(data));
		if (
			typeof frame === "object" &&
			frame !== null &&
			(frame as { type?: unknown }).type === "closeViewer"
		) {
			onCloseRequest(socket);
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	return socket;
};

/**
 * Polls at a short interval until the condition holds. Throws if it runs out of
 * time with the condition unmet
 */
const waitFor = async (
	isSatisfied: () => boolean,
	timeoutMs = 2_000,
): Promise<void> => {
	const deadline = Date.now() + timeoutMs;
	while (!isSatisfied()) {
		if (Date.now() > deadline) {
			throw new Error("condition was not met in time");
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
};

describe("closeViewers", () => {
	it("counts a window that closed as closed", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, (socket) => {
			socket.close();
		});

		expect(await host.closeViewers()).toEqual({
			closedCount: 1,
			remainingCount: 0,
		});
	});

	it("reports a window that refused to close as remaining, not as closed", async () => {
		const host = await startTestHost();
		// The case where the browser refused window.close() and the window
		// survived
		await connectFakeViewer(host, () => {});

		expect(await host.closeViewers()).toEqual({
			closedCount: 0,
			remainingCount: 1,
		});
	}, 15_000);

	it("returns 0 when no viewer is connected in the first place", async () => {
		const host = await startTestHost();

		expect(await host.closeViewers()).toEqual({
			closedCount: 0,
			remainingCount: 0,
		});
	});
});

describe("close", () => {
	it("shuts down even while a half-read connection is held open", async () => {
		// server.close() does not return until the connections it is handling
		// finish. The browser knows no signal to shut down, so waiting on this
		// stalls without ever shutting down
		const host = await startTestHost();
		const port = Number(new URL(host.url).port);
		const socket = net.connect(port, "127.0.0.1");
		await new Promise<void>((resolve, reject) => {
			socket.once("connect", () => {
				// Not sending the closing blank line = still mid-read as far as the
				// server is concerned
				socket.write("GET / HTTP/1.1\r\nHost: localhost\r\n");
				resolve();
			});
			socket.once("error", reject);
		});

		await host.close();

		socket.destroy();
	});
});

describe("onViewersGone", () => {
	it("is called once the last viewer leaves and does not come back within the grace period", async () => {
		let goneCount = 0;
		const host = await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = await connectFakeViewer(host, () => {});
		socket.close();

		await waitFor(() => goneCount === 1);
	});

	it("is not called while nothing has ever connected", async () => {
		let goneCount = 0;
		await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});

		await new Promise((resolve) => setTimeout(resolve, TEST_IDLE_DELAY_MS * 4));
		expect(goneCount).toBe(0);
	});

	it("is not called when something reconnects within the grace period", async () => {
		let goneCount = 0;
		const host = await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = await connectFakeViewer(host, () => {});
		socket.close();
		// The story where a reload dropped the connection for an instant
		await connectFakeViewer(host, () => {});

		await new Promise((resolve) => setTimeout(resolve, TEST_IDLE_DELAY_MS * 4));
		expect(goneCount).toBe(0);
	});
});

describe("openHeadlessViewer", () => {
	it("marks the window it opens as headless in the URL", async () => {
		const recorder = createBrowserLaunchRecorder();
		const host = await startTestHost({ launchBrowser: recorder.launchBrowser });
		// The page reads this to know nobody is looking at it, so it may close
		// itself when the host goes away
		const opening = host.openHeadlessViewer();
		await waitFor(() => recorder.launchedUrls.length === 1);
		await connectFakeViewer(host, () => {});

		expect(await opening).toEqual({ ok: true, didOpenWindow: true });
		expect(recorder.launchedUrls[0]).toBe(`${host.url}?headless=1`);
	});

	it("fails with a reason when the window never connects", async () => {
		const recorder = createBrowserLaunchRecorder();
		const host = await startTestHost({
			launchBrowser: recorder.launchBrowser,
			headlessConnectTimeoutMs: 50,
		});

		const outcome = await host.openHeadlessViewer();

		expect(outcome.ok).toBe(false);
		expect(outcome).toHaveProperty("reason", expect.stringContaining("never"));
	});

	it("reports the launch failing without waiting the wait out", async () => {
		const host = await startTestHost({
			launchBrowser: (_url, browserOptions) => {
				browserOptions.onFailure?.("no Chromium executable was found");
			},
			// Long enough that finishing at all means the wait was cut short
			headlessConnectTimeoutMs: 30_000,
		});

		expect(await host.openHeadlessViewer()).toEqual({
			ok: false,
			reason: "no Chromium executable was found",
		});
	});

	it("opens nothing when a viewer is already connected", async () => {
		const recorder = createBrowserLaunchRecorder();
		const host = await startTestHost({ launchBrowser: recorder.launchBrowser });
		await connectFakeViewer(host, () => {});

		expect(await host.openHeadlessViewer()).toEqual({
			ok: true,
			didOpenWindow: false,
		});
		expect(recorder.launchedUrls).toEqual([]);
	});

	it("keeps onViewersGone from firing while the headless window is connected", async () => {
		// The last window closing no longer means a person closed it: an eye left
		// open has to keep the host alive just as a visible window does
		let goneCount = 0;
		const recorder = createBrowserLaunchRecorder();
		const host = await startTestHost({
			launchBrowser: recorder.launchBrowser,
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const opening = host.openHeadlessViewer();
		await waitFor(() => recorder.launchedUrls.length === 1);
		const socket = await connectFakeViewer(host, () => {});
		await opening;

		await new Promise((resolve) => setTimeout(resolve, TEST_IDLE_DELAY_MS * 4));
		expect(goneCount).toBe(0);

		// And once it does go, the host is told as usual
		socket.close();
		await waitFor(() => goneCount === 1);
	});
});

describe("visible viewers", () => {
	it("does not count a headless window as something on screen", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, () => {}, "headless");

		expect(host.hasVisibleViewer()).toBe(false);

		await connectFakeViewer(host, () => {});
		expect(host.hasVisibleViewer()).toBe(true);
	});

	it("opens a window on demand, so a host held open by a headless one can still be looked at", async () => {
		const recorder = createBrowserLaunchRecorder();
		const host = await startTestHost({ launchBrowser: recorder.launchBrowser });
		await connectFakeViewer(host, () => {}, "headless");

		host.openVisibleViewer();

		// No query on it: this is the window a person looks at
		expect(recorder.launchedUrls).toEqual([host.url]);
	});

	it("opens nothing when the environment says not to put a window up", async () => {
		const recorder = createBrowserLaunchRecorder();
		const host = await startCanvasHost({
			workspaceRoot,
			port: TEST_PORT,
			idleShutdownDelayMs: TEST_IDLE_DELAY_MS,
			launchBrowser: recorder.launchBrowser,
		});
		openHosts.push(host);

		process.env.JISCRIBE_MCP_NO_OPEN = "1";
		try {
			host.openVisibleViewer();
		} finally {
			delete process.env.JISCRIBE_MCP_NO_OPEN;
		}

		// The host opened one of its own at startup; the on-demand call added none
		expect(recorder.launchedUrls).toEqual([host.url]);
	});
});

describe("close", () => {
	it("asks the headless window to close and leaves a person's window to reconnect", async () => {
		// A workspace switch closes the host and starts another on the new
		// directory. The visible window is expected to find that one on its own,
		// so it must not be told to close; the headless one has to be, as nothing
		// else will ever close it
		const host = await startTestHost({
			launchBrowser: (_url, browserOptions) => {
				browserOptions.onSpawn?.({ kill: () => true } as never);
			},
		});
		const opening = host.openHeadlessViewer();
		let didAskHeadless = false;
		let didAskVisible = false;
		await connectFakeViewer(
			host,
			(socket) => {
				didAskHeadless = true;
				socket.close();
			},
			"headless",
		);
		await opening;
		await connectFakeViewer(host, () => {
			didAskVisible = true;
		});

		await host.close();

		expect(didAskHeadless).toBe(true);
		expect(didAskVisible).toBe(false);
	});
});
