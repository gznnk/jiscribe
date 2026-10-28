// A document tool pointed at a file open_canvas has not created yet says so and
// names open_canvas, rather than passing the raw ENOENT through.

import { access } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let client: McpTestClient;
let workspace: TempCanvasWorkspace;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

describe("a document tool on a file that does not exist", () => {
	it.each([
		["get_object", { id: "box" }],
		["add_rect", { x: 0, y: 0 }],
		["diagnose_canvas", {}],
	])("%s points at open_canvas and creates nothing", async (name, args) => {
		const missingPath = join(workspace.dirPath, `${name}.jis.json`);
		const result = await client.callTool(name, { path: missingPath, ...args });
		expect(result.text).toMatch(/^error: .* does not exist yet; open_canvas /);
		await expect(access(missingPath)).rejects.toThrow();
	});

	it("still reports a file that does not parse as it did", async () => {
		const brokenPath = await workspace.writeText("broken.jis.json", "{");
		const result = await client.callTool("get_object", {
			path: brokenPath,
			id: "box",
		});
		expect(result.text).toMatch(/^error: file is not a valid CanvasDoc/);
	});
});
