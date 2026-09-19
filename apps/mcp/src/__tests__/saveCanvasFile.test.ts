// A tool's write-back against a writer that does not take our lock. The tools
// load, apply the operation and save under pathLock, which an editor or another
// process writing the file directly does not go through.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	CanvasFileError,
	loadCanvasFile,
	saveCanvasFile,
} from "../canvasStore";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let workspace: TempCanvasWorkspace;
let targetPath: string;

beforeEach(async () => {
	workspace = await createTempCanvasWorkspace();
	// Compact, so a write-back (tab-indented) can be told from it
	targetPath = await workspace.writeText(
		"target.jis.json",
		'{"version":1,"root":[]}\n',
	);
});

afterEach(async () => {
	await workspace.remove();
});

describe("saveCanvasFile", () => {
	it("writes over the file it loaded", async () => {
		const loaded = await loadCanvasFile(targetPath);

		await saveCanvasFile(targetPath, loaded.doc, loaded);

		expect(await readFile(targetPath, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("is refused, keeping the other write, when the file changed after it was loaded", async () => {
		const loaded = await loadCanvasFile(targetPath);
		const outsideText =
			'{"version":1,"root":[{"type":"rect","id":"outside-1","x":0,"y":0,"width":10,"height":10}]}\n';
		await writeFile(targetPath, outsideText, "utf8");

		await expect(
			saveCanvasFile(targetPath, loaded.doc, loaded),
		).rejects.toThrow(CanvasFileError);

		expect(await readFile(targetPath, "utf8")).toBe(outsideText);
		expect(await readdir(dirname(targetPath))).toEqual(["target.jis.json"]);
	});
});
