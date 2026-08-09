import { describe, expect, it } from "vitest";

import type { TextMeasureFont } from "../../../../../utils/text/measureText";
import { calcCaretContentOffset } from "../calcCaretContentOffset";

/**
 * Outside a browser every character is measured as `fontSize × 0.6`
 * (see measureTextWidth), so at this size one character is exactly 6px wide.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

const CHAR_WIDTH = 6;
const LINE_HEIGHT = 15;

const offsetOf = (
	text: string,
	caretIndex: number,
	overrides: Partial<Parameters<typeof calcCaretContentOffset>[0]> = {},
) =>
	calcCaretContentOffset({
		text,
		caretIndex,
		font,
		contentWidth: 100,
		lineHeight: LINE_HEIGHT,
		textAlign: "left",
		...overrides,
	});

describe("calcCaretContentOffset", () => {
	it("puts a caret at the very start on the content box's corner", () => {
		expect(offsetOf("hello", 0)).toEqual({ x: 0, y: 0 });
	});

	it("measures the caret's x from the start of its line", () => {
		expect(offsetOf("hello", 3)).toEqual({ x: 3 * CHAR_WIDTH, y: 0 });
	});

	it("counts the authored newlines before the caret as lines", () => {
		expect(offsetOf("ab\ncd\nef", 7)).toEqual({
			x: CHAR_WIDTH,
			y: 2 * LINE_HEIGHT,
		});
	});

	it("puts a caret on a trailing newline at the start of the next line", () => {
		expect(offsetOf("ab\n", 3)).toEqual({ x: 0, y: LINE_HEIGHT });
	});

	it("puts a caret at index 0 of a text starting with a newline on the corner", () => {
		expect(offsetOf("\nab", 0)).toEqual({ x: 0, y: 0 });
	});

	it("offsets a centered line by the slack around it", () => {
		// A 5-character line is 30 wide in a 100 wide box, so it starts at 35.
		expect(offsetOf("hello", 2, { textAlign: "center" })).toEqual({
			x: 35 + 2 * CHAR_WIDTH,
			y: 0,
		});
	});

	it("offsets a right-aligned line to the far edge", () => {
		expect(offsetOf("hello", 5, { textAlign: "right" })).toEqual({
			x: 100,
			y: 0,
		});
	});

	it("keeps a caret on a wrapped line inside the content width", () => {
		// 30 characters (180px) in a 60px box wrap onto three lines; the caret at the
		// end sits on the last of them, clamped to the right edge.
		const text = "a".repeat(30);

		expect(offsetOf(text, 30, { contentWidth: 60 })).toEqual({
			x: 60,
			y: 2 * LINE_HEIGHT,
		});
	});
});
