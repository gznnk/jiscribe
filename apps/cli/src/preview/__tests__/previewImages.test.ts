import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CanvasDoc } from "@jiscribe/doc";
import { afterAll, describe, expect, it } from "vitest";

import { collectPreviewImages } from "../previewImages";

/** Bytes standing in for a real file; only their identity matters here. */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-preview-images-"));
const docDir = join(workDir, "doc");
mkdirSync(join(workDir, "doc", "images"), { recursive: true });
writeFileSync(join(workDir, "doc", "logo.png"), PNG_BYTES);
writeFileSync(join(workDir, "doc", "images", "nested.png"), PNG_BYTES);
writeFileSync(join(workDir, "outside.png"), PNG_BYTES);

afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

/** An image shape as JSON: `src` is not a field of the base doc type. */
const image = (id: string, src: string): unknown => ({
	id,
	type: "image",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	src,
});

/**
 * A document as JSON rather than an object literal: what matters here is which
 * `src` strings are found and read, not the model's types.
 */
const docWith = (objects: readonly unknown[]): CanvasDoc =>
	JSON.parse(JSON.stringify({ version: 1, root: objects })) as CanvasDoc;

describe("collectPreviewImages", () => {
	it("reads an image beside the document as a data URI", () => {
		const { dataUris, warnings } = collectPreviewImages(
			docWith([image("a", "logo.png")]),
			docDir,
		);
		expect(warnings).toEqual([]);
		expect(dataUris["logo.png"]).toBe(
			`data:image/png;base64,${PNG_BYTES.toString("base64")}`,
		);
	});

	it("finds the images inside a group", () => {
		const { dataUris } = collectPreviewImages(
			docWith([
				{
					id: "g",
					type: "group",
					children: [
						image("a", "logo.png"),
						{
							id: "inner",
							type: "group",
							children: [image("b", "images/nested.png")],
						},
					],
				},
			]),
			docDir,
		);
		expect(Object.keys(dataUris)).toEqual(["logo.png", "images/nested.png"]);
	});

	it("reads a file shared by two shapes once", () => {
		const { dataUris } = collectPreviewImages(
			docWith([image("a", "logo.png"), image("b", "logo.png")]),
			docDir,
		);
		expect(Object.keys(dataUris)).toEqual(["logo.png"]);
	});

	it("leaves out an image it cannot read, and says which and why", () => {
		const { dataUris, warnings } = collectPreviewImages(
			docWith([image("a", "logo.png"), image("b", "missing.png")]),
			docDir,
		);
		expect(Object.keys(dataUris)).toEqual(["logo.png"]);
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('"missing.png"');
	});

	it("leaves out a src the document may not name", () => {
		const { dataUris, warnings } = collectPreviewImages(
			docWith([
				image("a", "../outside.png"),
				image("b", "/etc/passwd.png"),
				image("c", "https://example.com/logo.png"),
				image("d", "notes.txt"),
			]),
			docDir,
		);
		expect(dataUris).toEqual({});
		expect(warnings).toHaveLength(4);
	});

	it("has nothing to read for a document naming no image", () => {
		expect(
			collectPreviewImages(
				docWith([{ id: "r", type: "rect", x: 0, y: 0, width: 1, height: 1 }]),
				docDir,
			),
		).toEqual({ dataUris: {}, warnings: [] });
	});
});
