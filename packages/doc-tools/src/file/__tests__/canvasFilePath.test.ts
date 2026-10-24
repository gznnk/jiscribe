// The one gate every canvas file path goes through.

import { realpath, symlink, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CanvasFileError, toCanvasFilePath } from "../canvasStore";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let workspace: TempCanvasWorkspace;

beforeAll(async () => {
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
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
