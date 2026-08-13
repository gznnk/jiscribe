import { describe, expect, it } from "vitest";

import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";
import type { TextMeasureFont } from "../measureText";
import {
	calcVisualLineCount,
	calcVisualTextHeight,
	layoutVisualLines,
	measureTextWidth,
} from "../measureText";

/**
 * These run in the node environment, where there is no `document` and therefore
 * no canvas to measure with: every width comes from the documented fallback
 * (characters × fontSize × 0.6). With fontSize 10 that is exactly 6px per
 * character, which is what the widths below are chosen against — the wrapping
 * algorithm is what is under test, not the measurement.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character takes under the fallback measurement. */
const CHAR_WIDTH = 6;

describe("measureTextWidth", () => {
	it("falls back to a per-character estimate outside a browser", () => {
		expect(typeof document).toBe("undefined");
		expect(measureTextWidth("abc", font)).toBe(3 * CHAR_WIDTH);
	});

	it("an empty string has no width", () => {
		expect(measureTextWidth("", font)).toBe(0);
	});

	it("measures each run of a styled body under its own type size", () => {
		// "ab" at 10px (12px) plus "cd" at 20px (24px).
		expect(
			measureTextWidth([{ text: "ab" }, { text: "cd", fontSize: 20 }], font),
		).toBe(2 * CHAR_WIDTH + 2 * CHAR_WIDTH * 2);
	});
});

describe("layoutVisualLines", () => {
	it("lays the text out as authored when no width is given", () => {
		expect(
			layoutVisualLines("a\nbbb\nbb", font).map((line) => line.width),
		).toEqual([CHAR_WIDTH, 3 * CHAR_WIDTH, 2 * CHAR_WIDTH]);
	});

	it("an empty string is one line of no width, and so is each empty line", () => {
		expect(layoutVisualLines("", font)).toEqual([
			{ width: 0, height: font.fontSize * TEXT_LINE_HEIGHT },
		]);
		expect(layoutVisualLines("a\n\nb", font).map((line) => line.width)).toEqual(
			[CHAR_WIDTH, 0, CHAR_WIDTH],
		);
		expect(layoutVisualLines("a\n", font).map((line) => line.width)).toEqual([
			CHAR_WIDTH,
			0,
		]);
	});

	it("gives a line the height of the tallest type size drawn on it", () => {
		expect(
			layoutVisualLines(
				[{ text: "a\nb" }, { text: "c", fontSize: 30 }],
				font,
			).map((line) => line.height),
		).toEqual([10 * TEXT_LINE_HEIGHT, 30 * TEXT_LINE_HEIGHT]);
	});

	it("never draws a line shorter than the slot's own type size", () => {
		expect(
			layoutVisualLines([{ text: "a", fontSize: 4 }], font)[0].height,
		).toBe(10 * TEXT_LINE_HEIGHT);
	});

	it("does not break a word at a run boundary", () => {
		// "aaaaaa" is one word of 36px however much of it is styled, so a 40px box
		// keeps it on one line while the following word moves down.
		expect(
			layoutVisualLines(
				[{ text: "aaa" }, { text: "aaa bbb", fontWeight: "bold" }],
				font,
				40,
			),
		).toHaveLength(2);
	});
});

describe("calcVisualTextHeight", () => {
	it("adds up the line boxes, the taller runs included", () => {
		expect(
			calcVisualTextHeight(
				[{ text: "a\n" }, { text: "b", fontSize: 20 }],
				font,
			),
		).toBe(10 * TEXT_LINE_HEIGHT + 20 * TEXT_LINE_HEIGHT);
	});

	it("matches the line count times the line height when nothing is styled", () => {
		expect(calcVisualTextHeight("a\nb\nc", font, 100)).toBe(
			calcVisualLineCount("a\nb\nc", font, 100) *
				font.fontSize *
				TEXT_LINE_HEIGHT,
		);
	});
});

describe("calcVisualLineCount", () => {
	it("an empty string still occupies one line", () => {
		expect(calcVisualLineCount("", font, 100)).toBe(1);
	});

	it("counts authored newlines, empty lines included", () => {
		expect(calcVisualLineCount("a\n\nb", font, 100)).toBe(3);
	});

	it("keeps a line that fits on one line", () => {
		// "aaa bbb" = 7 characters = 42px.
		expect(calcVisualLineCount("aaa bbb", font, 60)).toBe(1);
	});

	it("breaks at the word boundary when the next word does not fit", () => {
		// "aaa " = 24px fits, adding "bbb" (18px) would need 42px.
		expect(calcVisualLineCount("aaa bbb", font, 40)).toBe(2);
	});

	it("counts the extra line a word boundary forces, which a width ratio misses", () => {
		// Three 6-character words in a 10-character box: each line has room for one
		// word only, so the box needs 3 lines where 120px / 60px estimates 2 — the
		// under-count that clipped the connector label.
		const words = "aaaaaa aaaaaa aaaaaa";
		expect(Math.ceil(measureTextWidth(words, font) / 60)).toBe(2);
		expect(calcVisualLineCount(words, font, 60)).toBe(3);
	});

	it("splits a word longer than the line between characters", () => {
		// 10 characters = 60px in a 30px box: 5 characters per line.
		expect(calcVisualLineCount("aaaaaaaaaa", font, 30)).toBe(2);
	});

	it("continues the following word after a word was split", () => {
		// Lines are "aaaaa" and "aaa b": the split word's remainder leaves room.
		expect(calcVisualLineCount("aaaaaaaa b", font, 30)).toBe(2);
	});

	it("trailing spaces hang past the edge instead of wrapping", () => {
		// "aaaaa" is exactly 30px; the trailing space must not add a line.
		expect(calcVisualLineCount("aaaaa ", font, 30)).toBe(1);
	});

	it("breaks CJK between characters, with no space needed", () => {
		// 5 characters, 2 per line.
		expect(calcVisualLineCount("あいうえお", font, 12)).toBe(3);
	});

	it("wraps each authored line on its own", () => {
		expect(calcVisualLineCount("aaa bbb\nccc", font, 40)).toBe(3);
	});

	it("a non-positive width still yields one line per character", () => {
		expect(calcVisualLineCount("ab", font, 0)).toBe(2);
	});
});
