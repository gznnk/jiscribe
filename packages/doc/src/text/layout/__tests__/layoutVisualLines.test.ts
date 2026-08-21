import { describe, expect, it } from "vitest";

import { layoutVisualLines } from "../layoutVisualLines";
import { TEXT_LINE_HEIGHT } from "../textLineHeight";
import { FALLBACK_CHAR_WIDTH, FALLBACK_FONT } from "./support/fallbackFont";

describe("layoutVisualLines", () => {
	it("lays the text out as authored when no width is given", () => {
		expect(
			layoutVisualLines("a\nbbb\nbb", FALLBACK_FONT).map((line) => line.width),
		).toEqual([
			FALLBACK_CHAR_WIDTH,
			3 * FALLBACK_CHAR_WIDTH,
			2 * FALLBACK_CHAR_WIDTH,
		]);
	});

	it("an empty string is one line of no width, and so is each empty line", () => {
		expect(layoutVisualLines("", FALLBACK_FONT)).toEqual([
			{
				start: 0,
				end: 0,
				width: 0,
				height: FALLBACK_FONT.fontSize * TEXT_LINE_HEIGHT,
			},
		]);
		expect(
			layoutVisualLines("a\n\nb", FALLBACK_FONT).map((line) => line.width),
		).toEqual([FALLBACK_CHAR_WIDTH, 0, FALLBACK_CHAR_WIDTH]);
		expect(
			layoutVisualLines("a\n", FALLBACK_FONT).map((line) => line.width),
		).toEqual([FALLBACK_CHAR_WIDTH, 0]);
	});

	it("gives a line the height of the tallest type size drawn on it", () => {
		expect(
			layoutVisualLines(
				[{ text: "a\nb" }, { text: "c", fontSize: 30 }],
				FALLBACK_FONT,
			).map((line) => line.height),
		).toEqual([10 * TEXT_LINE_HEIGHT, 30 * TEXT_LINE_HEIGHT]);
	});

	it("never draws a line shorter than the slot's own type size", () => {
		expect(
			layoutVisualLines([{ text: "a", fontSize: 4 }], FALLBACK_FONT)[0].height,
		).toBe(10 * TEXT_LINE_HEIGHT);
	});

	it("does not break a word at a run boundary", () => {
		// "aaaaaa" is one word of 36px however much of it is styled, so a 40px box
		// keeps it on one line while the following word moves down.
		expect(
			layoutVisualLines(
				[{ text: "aaa" }, { text: "aaa bbb", fontWeight: "bold" }],
				FALLBACK_FONT,
				40,
			),
		).toHaveLength(2);
	});
});
