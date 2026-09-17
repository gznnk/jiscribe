// Opening a file in another directory restarts the host on that directory, and
// the window the closed host had reconnects to the port on its own. The host
// replacing it must not put a second window up while that one is on its way back.
//
// No browser is opened: the launch is mocked and counted, and a ws client stands
// in for the window that reconnects.

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

import { readSessionToken } from "./hostSessionToken";
import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import type * as canvasHostModule from "../host/canvasHost";

/**
 * What the mock factories read. They run before the module body, so it is hoisted
 * with them
 */
const mocked = vi.hoisted(() => ({
	/** Stands in for the browser launch, and counts the windows that would have opened */
	openBrowser: vi.fn(),
	/**
	 * The port both hosts are pinned to. The tool layer never names one, and the
	 * window that reconnects has to find the new host where the old one was, which
	 * only holds if no other host on this machine took the port in between
	 */
	testPort: 5490,
	/**
	 * What the host's wait for the reconnecting window is shortened to. The tool
	 * layer's own grace is four seconds, which is a long time to spend twice
	 */
	graceMs: 1_500,
}));

vi.mock("../host/openBrowser", () => ({ openBrowser: mocked.openBrowser }));

// The host itself is the real one; what the wrapper changes is the port it is
// pinned to and how long the tool layer's wait for a window is allowed to run.
// Both are decided inside the host and the tool, neither of which takes them as an
// argument, and adding a setting for the tests alone would be a wider seam than
// the wrapper
vi.mock("../host/canvasHost", async (importActual) => {
	const actual = await importActual<typeof canvasHostModule>();
	return {
		...actual,
		startCanvasHost: async (
			options: Parameters<typeof actual.startCanvasHost>[0],
		) => {
			const host = await actual.startCanvasHost({
				...options,
				port: mocked.testPort,
			});
			return {
				...host,
				waitForViewer: async (timeoutMs: number) =>
					await host.waitForViewer(Math.min(timeoutMs, mocked.graceMs)),
			};
		},
	};
});

let client: McpTestClient;
let viewerRoot: string;
let workspaceRoot: string;
let otherWorkspaceRoot: string;
const openSockets: WebSocket[] = [];
const previousEnv: Record<string, string | undefined> = {};

/** The URL the viewer is served at, as the reply ends with it */
const viewerUrlOf = (text: string): string => {
	const url = /viewer: (\S+)$/.exec(text)?.[1];
	if (url === undefined) {
		throw new Error(`no viewer URL in the reply: ${text}`);
	}
	return url;
};

/**
 * Connects in place of a window a person is looking at: no headless query, and it
 * goes away when the host asks it to, as a real window does.
 *
 * @param viewerUrl The host's own URL
 * @param sessionToken The token that host handed out
 */
const connectViewer = async (
	viewerUrl: string,
	sessionToken: string,
): Promise<WebSocket> => {
	const socket = new WebSocket(
		`${viewerUrl.replace("http", "ws")}/ws?token=${sessionToken}`,
	);
	openSockets.push(socket);
	socket.on("message", (data) => {
		const frame = JSON.parse(String(data)) as {
			type?: unknown;
			requestId?: unknown;
		};
		if (frame.type === "closeViewer") {
			socket.close();
			return;
		}
		// A window holding no edits answers the flush before a switch at once;
		// left unanswered, the old host would wait out the flush timeout first
		if (frame.type === "flushEdits" && typeof frame.requestId === "string") {
			socket.send(
				JSON.stringify({ type: "flushed", requestId: frame.requestId }),
			);
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	return socket;
};

/**
 * Finds the host now on the port and connects to it, the way a window left
 * without one does: the token is fetched again on every attempt, and one that
 * comes back unchanged means the old host is still there.
 *
 * @param viewerUrl The URL the closed host was served at
 * @param staleToken The token the closed host had handed out
 */
const reconnectViewer = async (
	viewerUrl: string,
	staleToken: string,
): Promise<void> => {
	const deadline = Date.now() + mocked.graceMs;
	while (Date.now() < deadline) {
		try {
			const sessionToken = await readSessionToken(viewerUrl);
			if (sessionToken !== staleToken) {
				await connectViewer(viewerUrl, sessionToken);
				return;
			}
		} catch {
			// The port is between hosts; the next attempt is what a viewer does too
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	throw new Error("the window never found a host to reconnect to");
};

/** Opens a file and hands back the URL and the token of the host now serving it */
const openCanvasAt = async (
	filePath: string,
): Promise<{ viewerUrl: string; sessionToken: string }> => {
	const result = await client.callTool("open_canvas", { path: filePath });
	const viewerUrl = viewerUrlOf(result.text);
	return { viewerUrl, sessionToken: await readSessionToken(viewerUrl) };
};

beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	for (const name of ["JISCRIBE_MCP_VIEWER_ROOT", "JISCRIBE_MCP_NO_OPEN"]) {
		previousEnv[name] = process.env[name];
	}
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	// What is under test is whether a window is opened, so the escape hatch that
	// opens none has to be out of the way
	delete process.env.JISCRIBE_MCP_NO_OPEN;
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
	otherWorkspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws2-"));
	client = await connectMcpTestClient();
});

beforeEach(() => {
	mocked.openBrowser.mockClear();
});

afterEach(async () => {
	// Leaves no host holding a port for the next test
	await client.callTool("close_canvas", {});
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
});

afterAll(async () => {
	await client.close();
	for (const [name, value] of Object.entries(previousEnv)) {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	}
	await rm(viewerRoot, { recursive: true, force: true });
	await rm(workspaceRoot, { recursive: true, force: true });
	await rm(otherWorkspaceRoot, { recursive: true, force: true });
});

describe("open_canvas across workspaces", () => {
	it("leaves the window that reconnects to be the one on screen", async () => {
		const opened = await openCanvasAt(join(workspaceRoot, "a.jis.json"));
		await connectViewer(opened.viewerUrl, opened.sessionToken);
		expect(mocked.openBrowser).toHaveBeenCalledTimes(1);

		const switching = client.callTool("open_canvas", {
			path: join(otherWorkspaceRoot, "b.jis.json"),
		});
		await reconnectViewer(opened.viewerUrl, opened.sessionToken);
		await switching;

		expect(mocked.openBrowser).toHaveBeenCalledTimes(1);
	});

	it("opens one when the window the closed host had never comes back", async () => {
		const opened = await openCanvasAt(join(workspaceRoot, "c.jis.json"));
		await connectViewer(opened.viewerUrl, opened.sessionToken);
		expect(mocked.openBrowser).toHaveBeenCalledTimes(1);

		await client.callTool("open_canvas", {
			path: join(otherWorkspaceRoot, "d.jis.json"),
		});

		expect(mocked.openBrowser).toHaveBeenCalledTimes(2);
	});

	it("does not wait when there was no window to wait for", async () => {
		await openCanvasAt(join(workspaceRoot, "e.jis.json"));
		expect(mocked.openBrowser).toHaveBeenCalledTimes(1);

		const startedAt = Date.now();
		await client.callTool("open_canvas", {
			path: join(otherWorkspaceRoot, "f.jis.json"),
		});

		expect(mocked.openBrowser).toHaveBeenCalledTimes(2);
		expect(Date.now() - startedAt).toBeLessThan(mocked.graceMs);
	});
});
