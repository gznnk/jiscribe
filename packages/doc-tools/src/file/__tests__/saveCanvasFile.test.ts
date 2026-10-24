// A write-back against a writer outside the caller's own serialisation: an
// editor or another process writing the file directly between the load and the
// save.

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { CanvasDoc } from "@jiscribe/doc";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	CanvasFileError,
	createEmptyCanvasDoc,
	loadCanvasFile,
	saveCanvasFile,
	type LoadedCanvasFile,
} from "../canvasStore";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

/** The name the refusal message is to give the validation by. */
const validatorName = "check_this";

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

		await saveCanvasFile(targetPath, loaded.doc, { validatorName, loaded });

		expect(await readFile(targetPath, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("is refused, leaving the file as it was, when the edit makes the document invalid", async () => {
		const loaded = await loadCanvasFile(targetPath);
		const rect = {
			type: "rect",
			id: "dup-1",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		};
		const invalidDoc = {
			...loaded.doc,
			root: [rect, { ...rect, x: 20 }],
		} as unknown as CanvasDoc;

		await expect(
			saveCanvasFile(targetPath, invalidDoc, { validatorName, loaded }),
		).rejects.toThrow(/refused to write[\s\S]*valid: false/);

		expect(await readFile(targetPath, "utf8")).toBe(loaded.text);
	});

	it("names the validation the caller gave in its refusal", async () => {
		const loaded = await loadCanvasFile(targetPath);
		const rectWithUnknownKey = {
			type: "rect",
			id: "odd-1",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			customKey: "kept",
		};
		const docWithWarning = {
			...loaded.doc,
			root: [rectWithUnknownKey],
		} as unknown as CanvasDoc;

		await expect(
			saveCanvasFile(targetPath, docWithWarning, { validatorName, loaded }),
		).rejects.toThrow(
			"refused to write (the edit would add this to what check_this reports for the file):\nvalid: true\n1 issue(s):\n- warning odd-1: ",
		);
	});

	it("is refused, keeping the other write, when the file changed after it was loaded", async () => {
		const loaded = await loadCanvasFile(targetPath);
		const outsideText =
			'{"version":1,"root":[{"type":"rect","id":"outside-1","x":0,"y":0,"width":10,"height":10}]}\n';
		await writeFile(targetPath, outsideText, "utf8");

		await expect(
			saveCanvasFile(targetPath, loaded.doc, { validatorName, loaded }),
		).rejects.toThrow(CanvasFileError);

		expect(await readFile(targetPath, "utf8")).toBe(outsideText);
		expect(await readdir(dirname(targetPath))).toEqual(["target.jis.json"]);
	});

	it("creates a file it was told is new, when nothing appeared there meanwhile", async () => {
		const newPath = `${dirname(targetPath)}/new.jis`;

		await saveCanvasFile(newPath, createEmptyCanvasDoc(), {
			validatorName,
			isNewFile: true,
		});

		expect(await readFile(newPath, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("is refused, keeping the other file, when a file it was told is new appeared meanwhile", async () => {
		await expect(
			saveCanvasFile(targetPath, createEmptyCanvasDoc(), {
				validatorName,
				isNewFile: true,
			}),
		).rejects.toThrow(/refused to write: .* was created by something else/);

		expect(await readFile(targetPath, "utf8")).toBe(
			'{"version":1,"root":[]}\n',
		);
		expect(await readdir(dirname(targetPath))).toEqual(["target.jis.json"]);
	});

	it("replaces whatever is there when neither loaded nor isNewFile is given", async () => {
		await saveCanvasFile(targetPath, createEmptyCanvasDoc(), { validatorName });

		expect(await readFile(targetPath, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("does not compile a call naming both a loaded file and a new one", () => {
		const contradictoryCall = (loaded: LoadedCanvasFile): Promise<void> =>
			// @ts-expect-error a file loaded from disk is not a new file
			saveCanvasFile(targetPath, loaded.doc, {
				validatorName,
				loaded,
				isNewFile: true,
			});
		expect(contradictoryCall).toBeTypeOf("function");
	});
});
