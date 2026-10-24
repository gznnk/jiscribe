import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CanvasFileError, ensureCanvasFile } from "../canvasStore";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let workspace: TempCanvasWorkspace;
/**
 * A foothold for deriving a path inside the temporary directory that does not
 * exist yet
 */
let anchorPath: string;

beforeEach(async () => {
	workspace = await createTempCanvasWorkspace();
	anchorPath = await workspace.writeDoc("anchor.jis.json", {
		version: 1,
		root: [],
	});
});

afterEach(async () => {
	await workspace.remove();
});

const siblingPath = (fileName: string): string =>
	join(dirname(anchorPath), fileName);

describe("ensureCanvasFile", () => {
	it("creates a file that is not there as an empty canvas", async () => {
		const path = siblingPath("new.jis.json");

		expect(await ensureCanvasFile(path)).toBe(true);
		expect(await readFile(path, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("creates one even when the parent directory is missing", async () => {
		const path = siblingPath(join("nested", "deep", "new.jis.json"));

		expect(await ensureCanvasFile(path)).toBe(true);
		expect(await readFile(path, "utf8")).toContain('"version": 1');
	});

	it("leaves the contents of a file that already exists untouched", async () => {
		const path = await workspace.writeDoc("existing.jis.json", {
			version: 1,
			root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 }],
		});
		const before = await readFile(path, "utf8");

		expect(await ensureCanvasFile(path)).toBe(false);
		expect(await readFile(path, "utf8")).toBe(before);
	});

	it("does not open a broken file silently, and fails with a diagnostic", async () => {
		const path = await workspace.writeDoc("broken.jis.json", {
			version: 1,
			root: [{ id: "rect-1", type: "rect", x: "not a number" }],
		});

		await expect(ensureCanvasFile(path)).rejects.toBeInstanceOf(
			CanvasFileError,
		);
	});

	it("refuses a relative path", async () => {
		await expect(ensureCanvasFile("relative.jis.json")).rejects.toBeInstanceOf(
			CanvasFileError,
		);
	});
});
