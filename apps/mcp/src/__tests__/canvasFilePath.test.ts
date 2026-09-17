// The one gate every path argument goes through, checked both on its own and
// through a `tools/call` round trip.
//
// The tools used to disagree about what a path is: add_rect refused a relative
// one while add_object resolved it against the MCP process's cwd, which is not
// the user's workspace, and wrote a file nobody asked for.

import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CanvasFileError, toCanvasFilePath } from "../canvasStore";
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

describe("toCanvasFilePath", () => {
	it("takes every extension a canvas file may carry, whatever its case", () => {
		for (const fileName of [
			"diagram.jis",
			"diagram.jis.json",
			"diagram.jiscribe",
			"diagram.jiscribe.json",
			"DIAGRAM.JIS.JSON",
		]) {
			expect(toCanvasFilePath(join("/tmp", fileName))).toBe(
				join("/tmp", fileName),
			);
		}
	});

	it("folds out the . and .. segments of the path it gives back", () => {
		expect(toCanvasFilePath("/tmp/./nested/../diagram.jis")).toBe(
			"/tmp/diagram.jis",
		);
	});

	it("refuses a relative path", () => {
		expect(() => toCanvasFilePath("relative.jis.json")).toThrow(
			CanvasFileError,
		);
		expect(() => toCanvasFilePath("relative.jis.json")).toThrow(
			/path must be an absolute path/,
		);
	});

	it("refuses a file that is not a canvas, naming what it does take", () => {
		expect(() => toCanvasFilePath("/tmp/notes.txt")).toThrow(CanvasFileError);
		expect(() => toCanvasFilePath("/tmp/notes.txt")).toThrow(
			/\.jis, \.jis\.json, \.jiscribe, \.jiscribe\.json/,
		);
	});

	it("refuses a name that is nothing but the extension", () => {
		expect(() => toCanvasFilePath("/tmp/.jis")).toThrow(CanvasFileError);
	});
});

describe("the path argument of the tools", () => {
	it("refuses a relative path on a document tool as on our own, writing nothing", async () => {
		const relativePath = "jiscribe-mcp-relative.jis.json";

		const added = await client.callTool("add_object", {
			path: relativePath,
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 50,
		});

		expect(added.text).toMatch(/^error: path must be an absolute path/);
		expect(
			(await client.callTool("add_rect", { path: relativePath, x: 0, y: 0 }))
				.text,
		).toMatch(/^error: path must be an absolute path/);
	});

	it("refuses a path that names another kind of file", async () => {
		const result = await client.callTool("add_rect", {
			path: join("/tmp", "jiscribe-mcp-notes.txt"),
			x: 0,
			y: 0,
		});

		expect(result.text).toMatch(/^error: path must name a canvas file/);
	});

	it("treats the same file named two ways as one, so the undo history is shared", async () => {
		const targetPath = await workspace.writeDoc("alias.jis.json", {
			version: 1,
			root: [],
		});
		const detouringPath = join(targetPath, "..", "alias.jis.json");

		await client.callTool("add_rect", { path: targetPath, x: 0, y: 0 });
		const undone = await client.callTool("undo", { path: detouringPath });

		expect(undone.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});
});
