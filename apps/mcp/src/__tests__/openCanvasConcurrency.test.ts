// open_canvas holds the one host this server has, and reads it before the await
// that starts it. Two calls arriving together used to start a host each, leaving
// one running on a port nothing points at.
//
// No browser is opened: the environment says to put no window up, and the viewer
// assets are a stand-in directory, so what is under test is the tool layer.

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

import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import * as canvasHostModule from "../host/canvasHost";

/**
 * How long starting the host is held back for, in ms. It is read inside the mock
 * factory, which runs before the module body, so it is hoisted with it
 */
const timing = vi.hoisted(() => ({ startDelayMs: 50 }));

// Two hosts starting at once cannot be told apart by the reply: the later one
// overwrites the variable both replies read the URL from, so both read the same
// one back. What is watched is how many hosts were started, and the real host is
// started underneath so the rest of the reply stays true. Starting it is held
// back, the race being over a window that is otherwise gone within a tick
vi.mock("../host/canvasHost", async (importActual) => {
	const actual = await importActual<typeof canvasHostModule>();
	return {
		...actual,
		startCanvasHost: vi.fn(
			async (options: Parameters<typeof actual.startCanvasHost>[0]) => {
				await new Promise((resolve) =>
					setTimeout(resolve, timing.startDelayMs),
				);
				return await actual.startCanvasHost(options);
			},
		),
	};
});

let client: McpTestClient;
let viewerRoot: string;
let workspaceRoot: string;
const previousEnv: Record<string, string | undefined> = {};

/** The URL the viewer is served at, as the reply ends with it */
const viewerUrlOf = (text: string): string | undefined =>
	/viewer: (\S+)$/.exec(text)?.[1];

beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	for (const name of ["JISCRIBE_MCP_VIEWER_ROOT", "JISCRIBE_MCP_NO_OPEN"]) {
		previousEnv[name] = process.env[name];
	}
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	process.env.JISCRIBE_MCP_NO_OPEN = "1";
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
	client = await connectMcpTestClient();
});

beforeEach(() => {
	vi.mocked(canvasHostModule.startCanvasHost).mockClear();
});

afterEach(async () => {
	// Leaves no host holding a port for the next test
	await client.callTool("close_canvas", {});
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
});

describe("two open_canvas calls side by side", () => {
	it("start one host between them, both being answered with the same URL", async () => {
		const path = join(workspaceRoot, "together.jis.json");

		const [first, second] = await Promise.all([
			client.callTool("open_canvas", { path }),
			client.callTool("open_canvas", { path }),
		]);

		expect(first.text).not.toMatch(/^error:/);
		expect(second.text).not.toMatch(/^error:/);
		const firstUrl = viewerUrlOf(first.text);
		expect(firstUrl).toBeDefined();
		expect(viewerUrlOf(second.text)).toBe(firstUrl);
		expect(canvasHostModule.startCanvasHost).toHaveBeenCalledTimes(1);
	});

	it("hands the file to the same host even when the two name different files", async () => {
		const [first, second] = await Promise.all([
			client.callTool("open_canvas", {
				path: join(workspaceRoot, "one.jis.json"),
			}),
			client.callTool("open_canvas", {
				path: join(workspaceRoot, "two.jis.json"),
			}),
		]);

		expect(viewerUrlOf(second.text)).toBe(viewerUrlOf(first.text));
		expect(canvasHostModule.startCanvasHost).toHaveBeenCalledTimes(1);
	});

	it("gives the port back when close_canvas runs beside another open", async () => {
		const path = join(workspaceRoot, "closing.jis.json");
		await client.callTool("open_canvas", { path });

		// The two take the same lock, so the close either runs before the open
		// (which then starts a host again) or after it (leaving none)
		await Promise.all([
			client.callTool("close_canvas", {}),
			client.callTool("open_canvas", { path }),
		]);
		await client.callTool("close_canvas", {});

		const reopened = await client.callTool("open_canvas", { path });
		expect(reopened.text).not.toMatch(/^error:/);
	});
});
