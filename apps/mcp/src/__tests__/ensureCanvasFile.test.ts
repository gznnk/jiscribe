import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CanvasFileError, ensureCanvasFile } from "../canvasStore";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let workspace: TempCanvasWorkspace;
/** 一時ディレクトリの中の、まだ存在しないパスを得るための足場 */
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
	it("無いファイルは空のキャンバスとして作る", async () => {
		const path = siblingPath("new.jis.json");

		expect(await ensureCanvasFile(path)).toBe(true);
		expect(await readFile(path, "utf8")).toBe(
			'{\n\t"version": 1,\n\t"root": []\n}\n',
		);
	});

	it("親ディレクトリが無くても作る", async () => {
		const path = siblingPath(join("nested", "deep", "new.jis.json"));

		expect(await ensureCanvasFile(path)).toBe(true);
		expect(await readFile(path, "utf8")).toContain('"version": 1');
	});

	it("既にあるファイルは中身を触らない", async () => {
		const path = await workspace.writeDoc("existing.jis.json", {
			version: 1,
			root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 }],
		});
		const before = await readFile(path, "utf8");

		expect(await ensureCanvasFile(path)).toBe(false);
		expect(await readFile(path, "utf8")).toBe(before);
	});

	it("壊れたファイルは黙って開かず、診断付きで落ちる", async () => {
		const path = await workspace.writeDoc("broken.jis.json", {
			version: 1,
			root: [{ id: "rect-1", type: "rect", x: "not a number" }],
		});

		await expect(ensureCanvasFile(path)).rejects.toBeInstanceOf(
			CanvasFileError,
		);
	});

	it("相対パスは拒む", async () => {
		await expect(ensureCanvasFile("relative.jis.json")).rejects.toBeInstanceOf(
			CanvasFileError,
		);
	});
});
