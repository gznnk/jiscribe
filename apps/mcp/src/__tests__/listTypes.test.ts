// list_types describes the shape set rather than the drawing, so it answers
// before open_canvas has created the file it is pointed at, and leaves it uncreated.

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

describe("list_types", () => {
	it("answers for a file that does not exist yet, without creating it", async () => {
		const missingPath = join(workspace.dirPath, "not-yet.jis.json");
		const result = await client.callTool("list_types", { path: missingPath });
		expect(result.text).toMatch(/^the object types this canvas knows:\n/);
		expect(result.text).toContain('"type":"rect"');
		await expect(access(missingPath)).rejects.toThrow();
	});

	it("answers for a file that does not parse", async () => {
		const brokenPath = await workspace.writeText("broken.jis.json", "{");
		const result = await client.callTool("list_types", { path: brokenPath });
		expect(result.text).toMatch(/^the object types this canvas knows:\n/);
	});

	it("still refuses a path that is not a canvas file", async () => {
		const result = await client.callTool("list_types", {
			path: join(workspace.dirPath, "notes.txt"),
		});
		expect(result.text).toMatch(/^error: path must name a canvas file/);
	});
});
