// A runtime handed to several servers is what lets an app serve one MCP session
// per HTTP client over one canvas host. No browser is opened: the runtime's
// launchViewer stands in for it and connects a ws client where the window would
// have connected.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
	type Mock,
} from "vitest";
import WebSocket from "ws";

import { readSessionToken } from "./hostSessionToken";
import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import { VIEWER_STUB_HTML } from "./viewerStubHtml";
import type { BrowserOpenOptions } from "../host/openBrowser";
import { createJiscribeMcpRuntime, type JiscribeMcpRuntime } from "../server";

let viewerRoot: string;
let workspaceRoot: string;
const previousEnv: Record<string, string | undefined> = {};
const openSockets: WebSocket[] = [];
const openClients: McpTestClient[] = [];
const openRuntimes: JiscribeMcpRuntime[] = [];

/**
 * Connects in place of the window launchViewer was asked for. It carries the
 * query the launch URL has, so a headless launch connects as a headless window,
 * and it goes away when the host asks it to, as a real window does.
 *
 * @param launchUrl The URL launchViewer received, query included
 */
const connectViewer = async (launchUrl: string): Promise<void> => {
	const parsedUrl = new URL(launchUrl);
	const token = await readSessionToken(parsedUrl.origin);
	const extraQuery =
		parsedUrl.search === "" ? "" : `&${parsedUrl.search.slice(1)}`;
	const socket = new WebSocket(
		`${parsedUrl.origin.replace("http", "ws")}/ws?token=${token}${extraQuery}`,
	);
	openSockets.push(socket);
	socket.on("message", (data) => {
		const frame = JSON.parse(String(data)) as { type?: unknown };
		if (frame.type === "closeViewer") {
			socket.close();
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
};

/**
 * Creates a runtime whose windows are ws clients, and hands back the launches
 * still connecting so a test can wait for its window to be there.
 *
 * @param raiseVisibleViewer Passed to the runtime as it is
 */
const createTestRuntime = (
	raiseVisibleViewer?: () => void,
): {
	runtime: JiscribeMcpRuntime;
	launchViewer: Mock<(url: string, browserOptions: BrowserOpenOptions) => void>;
	waitForLaunchedViewers: () => Promise<void>;
} => {
	const pendingConnections: Promise<void>[] = [];
	const launchViewer = vi.fn(
		(url: string, _browserOptions: BrowserOpenOptions) => {
			pendingConnections.push(connectViewer(url));
		},
	);
	const runtime = createJiscribeMcpRuntime({
		launchViewer,
		...(raiseVisibleViewer === undefined ? {} : { raiseVisibleViewer }),
	});
	openRuntimes.push(runtime);
	return {
		runtime,
		launchViewer,
		waitForLaunchedViewers: async () => {
			await Promise.all(pendingConnections);
		},
	};
};

const connectClient = async (
	runtime: JiscribeMcpRuntime,
): Promise<McpTestClient> => {
	const client = await connectMcpTestClient({ runtime });
	openClients.push(client);
	return client;
};

beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), VIEWER_STUB_HTML, "utf8");
	for (const name of ["JISCRIBE_MCP_VIEWER_ROOT", "JISCRIBE_MCP_NO_OPEN"]) {
		previousEnv[name] = process.env[name];
	}
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	// Whether a window is launched is under test, so the escape hatch that
	// launches none has to be out of the way
	delete process.env.JISCRIBE_MCP_NO_OPEN;
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
});

afterEach(async () => {
	for (const client of openClients.splice(0)) {
		await client.close();
	}
	// Leaves no host holding a port for the next test
	for (const runtime of openRuntimes.splice(0)) {
		await runtime.close();
	}
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
});

afterAll(async () => {
	for (const [name, value] of Object.entries(previousEnv)) {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	}
	await rm(viewerRoot, { recursive: true, force: true });
	await rm(workspaceRoot, { recursive: true, force: true });
});

describe("a runtime shared by several servers", () => {
	it("gives them one host: the window one opened is closed by the other", async () => {
		const { runtime, waitForLaunchedViewers } = createTestRuntime();
		const openingClient = await connectClient(runtime);
		const closingClient = await connectClient(runtime);

		await openingClient.callTool("open_canvas", {
			path: join(workspaceRoot, "shared.jis.json"),
		});
		await waitForLaunchedViewers();

		expect((await closingClient.callTool("close_canvas", {})).text).toBe(
			"closed 1 viewer window(s) and stopped the local server",
		);
		expect((await openingClient.callTool("close_canvas", {})).text).toBe(
			"no canvas viewer is open",
		);
	});

	it("raises the window already on screen instead of launching another", async () => {
		const raiseVisibleViewer = vi.fn();
		const { runtime, launchViewer, waitForLaunchedViewers } =
			createTestRuntime(raiseVisibleViewer);
		const client = await connectClient(runtime);
		const path = join(workspaceRoot, "raise.jis.json");

		await client.callTool("open_canvas", { path });
		await waitForLaunchedViewers();
		expect(raiseVisibleViewer).not.toHaveBeenCalled();

		await client.callTool("open_canvas", { path });

		expect(raiseVisibleViewer).toHaveBeenCalledTimes(1);
		expect(launchViewer).toHaveBeenCalledTimes(1);
	});

	it("does not raise the window for a headless open", async () => {
		const raiseVisibleViewer = vi.fn();
		const { runtime, launchViewer, waitForLaunchedViewers } =
			createTestRuntime(raiseVisibleViewer);
		const client = await connectClient(runtime);
		const path = join(workspaceRoot, "headless.jis.json");
		await client.callTool("open_canvas", { path });
		await waitForLaunchedViewers();

		const result = await client.callTool("open_canvas", {
			path,
			headless: true,
		});

		expect(result.text).toMatch(/the viewer window already open/);
		expect(raiseVisibleViewer).not.toHaveBeenCalled();
		expect(launchViewer).toHaveBeenCalledTimes(1);
	});

	it("is left running when a server built on it closes", async () => {
		const { runtime, waitForLaunchedViewers } = createTestRuntime();
		const client = await connectClient(runtime);
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "outlives.jis.json"),
		});
		await waitForLaunchedViewers();

		await client.close();
		openClients.splice(openClients.indexOf(client), 1);

		expect(runtime.getHost()).not.toBeNull();
		expect(await runtime.closeCanvas()).toBe(
			"closed 1 viewer window(s) and stopped the local server",
		);
	});
});
