// The one gate every path argument goes through, checked both on its own and
// through a `tools/call` round trip.
//
// The tools used to disagree about what a path is: add_rect refused a relative
// one while add_object resolved it against the MCP process's cwd, which is not
// the user's workspace, and wrote a file nobody asked for.

import {
	lstat,
	mkdir,
	readFile,
	realpath,
	symlink,
	writeFile,
} from "node:fs/promises";
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

/**
 * Makes `<name>-real/` and a link `<name>-alias` to it inside the workspace, so
 * one file can be named two ways.
 */
const createLinkedDirs = async (
	name: string,
): Promise<{ realDirPath: string; aliasDirPath: string }> => {
	const realDirPath = join(workspace.dirPath, `${name}-real`);
	const aliasDirPath = join(workspace.dirPath, `${name}-alias`);
	await mkdir(realDirPath);
	await symlink(realDirPath, aliasDirPath, "dir");
	return { realDirPath, aliasDirPath };
};

describe("toCanvasFilePath", () => {
	it("takes every extension a canvas file may carry, whatever its case", async () => {
		const dirPath = await realpath(workspace.dirPath);
		for (const fileName of [
			"diagram.jis",
			"diagram.jis.json",
			"diagram.jiscribe",
			"diagram.jiscribe.json",
			"DIAGRAM.JIS.JSON",
		]) {
			expect(await toCanvasFilePath(join(dirPath, fileName))).toBe(
				join(dirPath, fileName),
			);
		}
	});

	it("folds out the . and .. segments of the path it gives back", async () => {
		const dirPath = await realpath(workspace.dirPath);
		expect(await toCanvasFilePath(`${dirPath}/./nested/../diagram.jis`)).toBe(
			join(dirPath, "diagram.jis"),
		);
	});

	it("refuses a relative path", async () => {
		await expect(toCanvasFilePath("relative.jis.json")).rejects.toThrow(
			CanvasFileError,
		);
		await expect(toCanvasFilePath("relative.jis.json")).rejects.toThrow(
			/path must be an absolute path/,
		);
	});

	it("refuses a file that is not a canvas, naming what it does take", async () => {
		await expect(toCanvasFilePath("/tmp/notes.txt")).rejects.toThrow(
			CanvasFileError,
		);
		await expect(toCanvasFilePath("/tmp/notes.txt")).rejects.toThrow(
			/\.jis, \.jis\.json, \.jiscribe, \.jiscribe\.json/,
		);
	});

	it("refuses a name that is nothing but the extension", async () => {
		await expect(toCanvasFilePath("/tmp/.jis")).rejects.toThrow(
			CanvasFileError,
		);
	});

	it("gives one file reached through a linked directory the same path both ways", async () => {
		const { realDirPath, aliasDirPath } = await createLinkedDirs("existing");
		await writeFile(join(realDirPath, "a.jis"), "{}");

		expect(await toCanvasFilePath(join(aliasDirPath, "a.jis"))).toBe(
			await toCanvasFilePath(join(realDirPath, "a.jis")),
		);
	});

	it("gives a file not created yet the same path under both spellings", async () => {
		const { realDirPath, aliasDirPath } = await createLinkedDirs("missing");

		const viaAlias = await toCanvasFilePath(
			join(aliasDirPath, "nested", "new.jis"),
		);

		expect(viaAlias).toBe(
			await toCanvasFilePath(join(realDirPath, "nested", "new.jis")),
		);
		expect(viaAlias).toBe(
			join(await realpath(realDirPath), "nested", "new.jis"),
		);
	});

	it("gives back where a linked canvas file leads", async () => {
		const targetPath = await workspace.writeDoc("link-target.jis", {
			version: 1,
			root: [],
		});
		const linkPath = join(workspace.dirPath, "link-source.jis");
		await symlink(targetPath, linkPath);

		expect(await toCanvasFilePath(linkPath)).toBe(await realpath(targetPath));
	});

	it("refuses a canvas-named link that leads to another kind of file", async () => {
		const secretPath = await workspace.writeText("secret.txt", "top secret\n");
		const linkPath = join(workspace.dirPath, "disguised.jis");
		await symlink(secretPath, linkPath);

		await expect(toCanvasFilePath(linkPath)).rejects.toThrow(CanvasFileError);
		await expect(toCanvasFilePath(linkPath)).rejects.toThrow(
			/is a link to another kind of file/,
		);
	});

	it("refuses a link cycle as a path it cannot resolve", async () => {
		const linkPath = join(workspace.dirPath, "cycle.jis");
		await symlink(linkPath, linkPath);

		await expect(toCanvasFilePath(linkPath)).rejects.toThrow(
			/failed to resolve path/,
		);
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
	it("keeps the undo history for a file reached through a linked directory under either spelling", async () => {
		const { realDirPath, aliasDirPath } = await createLinkedDirs("undo");
		await workspace.writeDoc(join("undo-real", "a.jis"), {
			version: 1,
			root: [],
		});

		await client.callTool("add_rect", {
			path: join(realDirPath, "a.jis"),
			x: 0,
			y: 0,
		});
		const undone = await client.callTool("undo", {
			path: join(aliasDirPath, "a.jis"),
		});

		expect(undone.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(join(realDirPath, "a.jis"))).root).toEqual(
			[],
		);
	});

	it("updates the file a linked canvas file leads to, leaving the link a link", async () => {
		const targetPath = await workspace.writeDoc("in-place-target.jis", {
			version: 1,
			root: [],
		});
		const linkPath = join(workspace.dirPath, "in-place-link.jis");
		await symlink(targetPath, linkPath);

		const added = await client.callTool("add_rect", {
			path: linkPath,
			x: 0,
			y: 0,
		});

		expect(added.text).not.toMatch(/^error:/);
		expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
		expect((await workspace.readDoc(targetPath)).root).toHaveLength(1);
	});

	it("neither reads nor writes what a canvas-named link to another kind of file leads to", async () => {
		const secretText = "top secret line\n";
		const secretPath = await workspace.writeText("leak.txt", secretText);
		const linkPath = join(workspace.dirPath, "leak.jis");
		await symlink(secretPath, linkPath);

		const diagnosed = await client.callTool("diagnose_canvas", {
			path: linkPath,
		});
		const added = await client.callTool("add_rect", {
			path: linkPath,
			x: 0,
			y: 0,
		});

		expect(diagnosed.text).toMatch(/^error: path must name a canvas file/);
		expect(diagnosed.text).not.toContain("top secret");
		expect(added.text).toMatch(/^error: path must name a canvas file/);
		expect(await readFile(secretPath, "utf8")).toBe(secretText);
	});
});
