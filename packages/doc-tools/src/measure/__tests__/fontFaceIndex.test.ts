// Runs against the @fontsource packages doc-tools depends on: what is under test
// is reading their stylesheets, which nothing else can stand in for.

import { existsSync } from "node:fs";
import { basename } from "node:path";

import { describe, expect, it } from "vitest";

import { getFontFaceIndex } from "../fontFaceIndex";

const LATIN_A = 0x41;
const HIRAGANA_A = 0x3042;

/** The `.woff` a family's index names for a code point, by file name alone. */
const fileNameFor = (
	family: string,
	fontWeight: string,
	italic: boolean,
	codePoint: number,
): string | null => {
	const filePath = getFontFaceIndex(
		family,
		fontWeight,
		italic,
	)?.findFileForCodePoint(codePoint);
	return filePath == null ? null : basename(filePath);
};

describe("getFontFaceIndex", () => {
	it("names a .woff that exists on disk for a covered code point", () => {
		const filePath = getFontFaceIndex(
			"Source Sans 3",
			"normal",
			false,
		)?.findFileForCodePoint(LATIN_A);
		expect(filePath).toMatch(/source-sans-3-latin-400-normal\.woff$/);
		expect(existsSync(filePath ?? "")).toBe(true);
	});

	it("picks the subset whose unicode-range holds the code point", () => {
		expect(fileNameFor("Noto Sans JP", "normal", false, HIRAGANA_A)).toMatch(
			/^noto-sans-jp-\d+-400-normal\.woff$/,
		);
	});

	it("reads bold as 700", () => {
		expect(fileNameFor("Source Sans 3", "bold", false, LATIN_A)).toBe(
			"source-sans-3-latin-700-normal.woff",
		);
	});

	it.each([
		["700", "600"],
		["900", "600"],
		["100", "400"],
	])(
		"snaps %s to %s for a family shipping 400 and 600 only",
		(asked, shipped) => {
			expect(fileNameFor("Klee One", asked, false, HIRAGANA_A)).toMatch(
				new RegExp(`^klee-one-\\d+-${shipped}-normal\\.woff$`),
			);
		},
	);

	it("prefers the italic faces where the family ships them", () => {
		expect(fileNameFor("Source Sans 3", "normal", true, LATIN_A)).toBe(
			"source-sans-3-latin-400-italic.woff",
		);
	});

	it("falls back to the upright faces for a family shipping no italic", () => {
		expect(fileNameFor("Noto Sans JP", "normal", true, HIRAGANA_A)).toMatch(
			/-400-normal\.woff$/,
		);
	});

	it("answers null for a code point no subset covers", () => {
		// A private-use code point, which no shipped family draws.
		expect(fileNameFor("Source Sans 3", "normal", false, 0xe000)).toBeNull();
	});

	it("answers null for a family the canvas does not ship", () => {
		expect(getFontFaceIndex("Comic Sans MS", "normal", false)).toBeNull();
	});

	it("hands back the same index for the same family, weight and style", () => {
		expect(getFontFaceIndex("Caveat", "normal", false)).toBe(
			getFontFaceIndex("Caveat", "400", false),
		);
	});
});
