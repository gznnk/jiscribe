// A runtime handed to several servers is what lets an app serve one MCP session
// per HTTP client over one canvas host. No browser is opened: the runtime's
// launchViewer stands in for it and connects a ws client where the window would
// have connected.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
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

import { readSession, readSessionToken } from "./hostSession";
import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import { VIEWER_STUB_HTML } from "./viewerStubHtml";
import type { BrowserOpenOptions } from "../host/openBrowser";
import type { JiscribeMcpRuntimeOptions } from "../runtime";
import { createJiscribeMcpRuntime, type JiscribeMcpRuntime } from "../server";
import { SESSION_TOKEN_HEADER } from "../shared/fileApiRoute";
import {
	HOST_ACTION_API_PATHNAME,
	HOST_ACTION_DONE_STATUS,
	type HostActionName,
} from "../shared/hostActionsRoute";

let viewerRoot: string;
let workspaceRoot: string;
const previousEnv: Record<string, string | undefined> = {};
const openSockets: WebSocket[] = [];
const openClients: McpTestClient[] = [];
const openRuntimes: JiscribeMcpRuntime[] = [];
const otherWorkspaceRoots: string[] = [];

/**
 * A directory beside `workspaceRoot`: opening a file in it makes the runtime
 * replace its host. Removed after the test, once the runtimes are closed
 */
const makeOtherWorkspaceRoot = async (): Promise<string> => {
	const otherWorkspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
	otherWorkspaceRoots.push(otherWorkspaceRoot);
	return otherWorkspaceRoot;
};

/**
 * Asks a host for an action the way the viewer's menu does, over a connection of
 * its own (see readSession on why not fetch).
 *
 * @param hostUrl The host's own URL, as CanvasHost.url gives it
 * @param actionName The action to ask for
 * @returns The status the host answered with. A connection the host cuts
 *   before answering rejects, as the viewer's fetch would
 */
const postHostAction = async (
	hostUrl: string,
	actionName: HostActionName,
): Promise<number> => {
	const token = await readSessionToken(hostUrl);
	return await new Promise<number>((resolve, reject) => {
		const request = http.request(
			`${hostUrl}${HOST_ACTION_API_PATHNAME}`,
			{
				method: "POST",
				agent: false,
				headers: {
					[SESSION_TOKEN_HEADER]: token,
					"Content-Type": "application/json",
				},
			},
			(response) => {
				const { statusCode } = response;
				if (statusCode === undefined) {
					reject(new Error("the host answered with no status"));
					return;
				}
				response.resume();
				response.on("end", () => {
					resolve(statusCode);
				});
			},
		);
		request.on("error", reject);
		request.end(JSON.stringify({ action: actionName }));
	});
};

/**
 * Connects in place of the window launchViewer was asked for. It carries the
 * query the launch URL has, so a headless launch connects as a headless window,
 * and as a real window does it goes away when the host asks it to and answers
 * a flush at once (it holds no edits), so a workspace switch does not wait the
 * flush out.
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
		const frame = JSON.parse(String(data)) as {
			type?: unknown;
			requestId?: unknown;
		};
		if (frame.type === "closeViewer") {
			socket.close();
		} else if (frame.type === "flushEdits") {
			socket.send(
				JSON.stringify({ type: "flushed", requestId: frame.requestId }),
			);
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
 * @param runtimeOptions Passed to the runtime as they are, launchViewer aside
 */
const createTestRuntime = (
	runtimeOptions: Omit<JiscribeMcpRuntimeOptions, "launchViewer"> = {},
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
	const runtime = createJiscribeMcpRuntime({ ...runtimeOptions, launchViewer });
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
	for (const otherWorkspaceRoot of otherWorkspaceRoots.splice(0)) {
		await rm(otherWorkspaceRoot, { recursive: true, force: true });
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
		const { runtime, launchViewer, waitForLaunchedViewers } = createTestRuntime(
			{ raiseVisibleViewer },
		);
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
		const { runtime, launchViewer, waitForLaunchedViewers } = createTestRuntime(
			{ raiseVisibleViewer },
		);
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

	it("hands the owner's actions to every host it starts, the one after a workspace switch included", async () => {
		const { runtime, waitForLaunchedViewers } = createTestRuntime({
			hostActions: { openFile: vi.fn(), quit: vi.fn() },
		});
		const client = await connectClient(runtime);
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "offered.jis.json"),
		});
		await waitForLaunchedViewers();
		const firstHost = runtime.getHost();
		expect(firstHost).not.toBeNull();

		expect((await readSession(firstHost!.url)).actions).toEqual([
			"openFile",
			"quit",
		]);

		// A file in another directory restarts the host on that directory, and the
		// new host is built by the same code path; what it offers must not depend
		// on which call started it
		const otherWorkspaceRoot = await makeOtherWorkspaceRoot();
		await client.callTool("open_canvas", {
			path: join(otherWorkspaceRoot, "switched.jis.json"),
		});
		await waitForLaunchedViewers();
		const secondHost = runtime.getHost();
		expect(secondHost).not.toBe(firstHost);

		expect((await readSession(secondHost!.url)).actions).toEqual([
			"openFile",
			"quit",
		]);
		await runtime.close();
		// The switch gives the first host's window RECONNECT_GRACE_MS (4 s) to come
		// back before the second host puts one up, which the default 5 s cannot hold
	}, 15_000);
});

// Both tests switch to another directory, which replaces the host and gives
// the old host's window RECONNECT_GRACE_MS (4 s) to come back; the default 5 s
// cannot hold that
describe("an openFile action that switches the host to another directory", () => {
	it("is answered when it settles first and starts the switch detached, and the switch then happens", async () => {
		const otherWorkspaceRoot = await makeOtherWorkspaceRoot();
		// The desktop app's openFile: it returns once the dialog has closed and
		// leaves the open running
		const switches: Promise<string>[] = [];
		const { runtime, waitForLaunchedViewers } = createTestRuntime({
			hostActions: {
				openFile: () => {
					switches.push(
						runtime.openCanvas(join(otherWorkspaceRoot, "switched.jis.json"), {
							headless: false,
						}),
					);
				},
			},
		});
		const client = await connectClient(runtime);
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "asked.jis.json"),
		});
		await waitForLaunchedViewers();
		const firstHost = runtime.getHost();
		expect(firstHost).not.toBeNull();

		expect(await postHostAction(firstHost!.url, "openFile")).toBe(
			HOST_ACTION_DONE_STATUS,
		);

		expect(switches).toHaveLength(1);
		await Promise.all(switches);
		await waitForLaunchedViewers();
		const secondHost = runtime.getHost();
		expect(secondHost).not.toBe(firstHost);
		expect(secondHost!.getOpenPath()).toBe("switched.jis.json");
	}, 15_000);

	it("is cut off when it waits for the switch itself: the switch closes the host it is answered through", async () => {
		const otherWorkspaceRoot = await makeOtherWorkspaceRoot();
		const switches: Promise<string>[] = [];
		const { runtime, waitForLaunchedViewers } = createTestRuntime({
			hostActions: {
				openFile: async () => {
					const switching = runtime.openCanvas(
						join(otherWorkspaceRoot, "awaited.jis.json"),
						{ headless: false },
					);
					switches.push(switching);
					await switching;
				},
			},
		});
		const client = await connectClient(runtime);
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "asking.jis.json"),
		});
		await waitForLaunchedViewers();
		const firstHost = runtime.getHost();
		expect(firstHost).not.toBeNull();

		// What the viewer sees is a failed request over a canvas that did open
		await expect(postHostAction(firstHost!.url, "openFile")).rejects.toThrow();

		expect(switches).toHaveLength(1);
		await Promise.all(switches);
		await waitForLaunchedViewers();
		expect(runtime.getHost()!.getOpenPath()).toBe("awaited.jis.json");
	}, 15_000);
});
