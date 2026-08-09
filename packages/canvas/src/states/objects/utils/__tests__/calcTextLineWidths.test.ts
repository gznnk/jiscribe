import { describe, expect, it } from "vitest";

import { calcTextBlockSize } from "../calcTextBlockSize";
import { calcTextLineWidths } from "../calcTextLineWidths";
import type { TextMeasureFont } from "../measureText";

/**
 * These run in the node environment, where there is no canvas to measure with:
 * every width comes from the documented fallback (characters × fontSize × 0.6).
 * With fontSize 10 that is exactly 6px per character.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character takes under the fallback measurement. */
const CHAR_WIDTH = 6;

/** Padding and slack calcTextBlockSize adds around the widest line. */
const HORIZONTAL_EXTRA = 6 * 2 + 2;

describe("calcTextLineWidths", () => {
	it("measures an empty text as one line of no width", () => {
		expect(calcTextLineWidths("", font)).toEqual([0]);
	});

	it("returns one width per authored line, in order", () => {
		expect(calcTextLineWidths("a\nbbb\nbb", font)).toEqual([
			CHAR_WIDTH,
			3 * CHAR_WIDTH,
			2 * CHAR_WIDTH,
		]);
	});

	it("measures an empty line as 0, wherever it sits", () => {
		expect(calcTextLineWidths("a\n\nb", font)).toEqual([
			CHAR_WIDTH,
			0,
			CHAR_WIDTH,
		]);
		expect(calcTextLineWidths("a\n", font)).toEqual([CHAR_WIDTH, 0]);
	});

	it("never wraps, so a long line stays one width", () => {
		expect(calcTextLineWidths("a".repeat(500), font)).toEqual([
			500 * CHAR_WIDTH,
		]);
	});

	it("scales every width with the font size", () => {
		expect(calcTextLineWidths("ab\nabc", { ...font, fontSize: 20 })).toEqual([
			24, 36,
		]);
	});

	it("agrees with the box calcTextBlockSize measures: widest line plus padding", () => {
		const text = "ab\nabcdefghij\nabcd";
		const widest = Math.max(...calcTextLineWidths(text, font));
		expect(calcTextBlockSize(text, font).width).toBe(widest + HORIZONTAL_EXTRA);
	});
});
