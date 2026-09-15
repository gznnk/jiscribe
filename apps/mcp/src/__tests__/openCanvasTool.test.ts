// The two tools that own the viewer's lifetime, driven through the MCP protocol
// itself. No browser is opened: the environment is set to put no window up, and
// the headless path is pointed at an executable that is not there, so what is
// under test is the tool layer rather than whatever browser the machine has.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";

/**
 * Named as the headless browser. Nothing is there, so the launch fails the same
 * way on every machine instead of putting up a real window
 */
const MISSING_BROWSER_PATH = join(tmpdir(), "jiscribe-mcp-no-such-browser");

let client: McpTestClient;
let viewerRoot: string;
let workspaceRoot: string;
let otherWorkspaceRoot: string;
const previousEnv: Record<string, string | undefined> = {};

const emptyDocText = '{"version":1,"root":[]}\n';

beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	for (const name of [
		"JISCRIBE_MCP_VIEWER_ROOT",
		"JISCRIBE_MCP_NO_OPEN",
		"JISCRIBE_MCP_BROWSER",
	]) {
		previousEnv[name] = process.env[name];
	}
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	process.env.JISCRIBE_MCP_NO_OPEN = "1";
	process.env.JISCRIBE_MCP_BROWSER = MISSING_BROWSER_PATH;
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
	otherWorkspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws2-"));
	client = await connectMcpTestClient();
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
	await rm(otherWorkspaceRoot, { recursive: true, force: true });
});

describe("open_canvas", () => {
	it("creates a canvas that is not there yet and hands back the URL", async () => {
		const path = join(workspaceRoot, "new.jis.json");

		const result = await client.callTool("open_canvas", { path });

		expect(result.isError).toBe(false);
		expect(result.text).toMatch(
			/^created and opened new\.jis\.json — viewer: http:\/\/localhost:\d+$/,
		);
		expect(await readFile(path, "utf8")).toContain('"version": 1');
	});

	it("leaves a file that is already there as it is", async () => {
		const path = join(workspaceRoot, "existing.jis.json");
		await writeFile(path, emptyDocText, "utf8");

		const result = await client.callTool("open_canvas", { path });

		expect(result.text).toMatch(/^opened existing\.jis\.json — viewer: /);
		expect(await readFile(path, "utf8")).toBe(emptyDocText);
	});

	it("moves the file API with it when told to open another directory", async () => {
		// The host serves one directory, so a file elsewhere restarts it. What
		// proves the restart is where the write endpoint now lands
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "first.jis.json"),
		});
		const result = await client.callTool("open_canvas", {
			path: join(otherWorkspaceRoot, "second.jis.json"),
		});

		expect(result.text).toMatch(/^created and opened second\.jis\.json/);
		const viewerUrl = /viewer: (\S+)$/.exec(result.text)?.[1];
		const response = await fetch(
			`${viewerUrl}/api/file?path=written.jis.json`,
			{
				method: "PUT",
				body: emptyDocText,
			},
		);
		expect(response.status).toBe(200);
		expect(
			await readFile(join(otherWorkspaceRoot, "written.jis.json"), "utf8"),
		).toBe(emptyDocText);
	});

	it("refuses a relative path", async () => {
		const result = await client.callTool("open_canvas", {
			path: "relative.jis.json",
		});

		expect(result.text).toMatch(/^error: path must be an absolute path/);
	});

	it("refuses to open a file it cannot parse", async () => {
		// Opening a broken file shows an empty screen and says nothing about why
		const path = join(workspaceRoot, "broken.jis.json");
		await writeFile(path, "{ not json", "utf8");

		const result = await client.callTool("open_canvas", { path });

		expect(result.text).toMatch(/^error: /);
		expect(result.text).toContain("syntax error");
	});

	it("says the canvas was opened but no eye could be put on it", async () => {
		// The file is opened either way; what fails is the window the on-screen
		// tools need, and the AI is told so rather than finding out by the next
		// capture timing out
		const result = await client.callTool("open_canvas", {
			path: join(workspaceRoot, "headless.jis.json"),
			headless: true,
		});

		expect(result.text).toMatch(
			/^error: created and opened headless\.jis\.json/,
		);
		expect(result.text).toContain("no headless viewer could be opened");
		expect(result.text).toContain(MISSING_BROWSER_PATH);
	});
});

describe("close_canvas", () => {
	it("says so when nothing is open", async () => {
		expect((await client.callTool("close_canvas", {})).text).toBe(
			"no canvas viewer is open",
		);
	});

	it("stops the server a viewerless open left running", async () => {
		await client.callTool("open_canvas", {
			path: join(workspaceRoot, "toclose.jis.json"),
		});

		expect((await client.callTool("close_canvas", {})).text).toBe(
			"no viewer window was open; stopped the local server",
		);
	});

	it("gives the port back, so opening again works", async () => {
		const path = join(workspaceRoot, "again.jis.json");
		const firstResult = await client.callTool("open_canvas", { path });
		await client.callTool("close_canvas", {});

		const secondResult = await client.callTool("open_canvas", { path });

		expect(secondResult.text).toBe(
			firstResult.text.replace("created and ", ""),
		);
	});
});
