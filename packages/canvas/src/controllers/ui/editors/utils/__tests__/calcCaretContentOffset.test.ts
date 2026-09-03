import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";
import { describe, expect, it } from "vitest";

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
/** `fontSize × TEXT_LINE_HEIGHT` for the slot's own font. */
const LINE_HEIGHT = 15;

const offsetOf = (
	text: RichText,
	caretIndex: number,
	overrides: Partial<Parameters<typeof calcCaretContentOffset>[0]> = {},
) =>
	calcCaretContentOffset({
		text,
		caretIndex,
		font,
		contentWidth: 100,
		textAlign: "left",
		...overrides,
	});

describe("calcCaretContentOffset", () => {
	it("puts a caret at the very start on the content box's corner", () => {
		expect(offsetOf("hello", 0)).toEqual({ x: 0, y: 0, height: LINE_HEIGHT });
	});

	it("measures the caret's x from the start of its line", () => {
		expect(offsetOf("hello", 3)).toEqual({
			x: 3 * CHAR_WIDTH,
			y: 0,
			height: LINE_HEIGHT,
		});
	});

	it("counts the authored newlines before the caret as lines", () => {
		expect(offsetOf("ab\ncd\nef", 7)).toEqual({
			x: CHAR_WIDTH,
			y: 2 * LINE_HEIGHT,
			height: LINE_HEIGHT,
		});
	});

	it("puts a caret on a trailing newline at the start of the next line", () => {
		expect(offsetOf("ab\n", 3)).toEqual({
			x: 0,
			y: LINE_HEIGHT,
			height: LINE_HEIGHT,
		});
	});

	it("puts a caret at index 0 of a text starting with a newline on the corner", () => {
		expect(offsetOf("\nab", 0)).toEqual({ x: 0, y: 0, height: LINE_HEIGHT });
	});

	it("offsets a centered line by the slack around it", () => {
		// A 5-character line is 30 wide in a 100 wide box, so it starts at 35.
		expect(offsetOf("hello", 2, { textAlign: "center" })).toEqual({
			x: 35 + 2 * CHAR_WIDTH,
			y: 0,
			height: LINE_HEIGHT,
		});
	});

	it("offsets a right-aligned line to the far edge", () => {
		expect(offsetOf("hello", 5, { textAlign: "right" })).toEqual({
			x: 100,
			y: 0,
			height: LINE_HEIGHT,
		});
	});

	it("measures the caret along the wrapped line it is drawn on", () => {
		// 30 characters (180px) in a 60px box wrap onto three lines of 10; the caret
		// at the end sits at the end of the third, which is the box's right edge.
		const text = "a".repeat(30);

		expect(offsetOf(text, 30, { contentWidth: 60 })).toEqual({
			x: 60,
			y: 2 * LINE_HEIGHT,
			height: LINE_HEIGHT,
		});
		// Halfway into the second line, rather than clamped to the first line's edge.
		expect(offsetOf(text, 15, { contentWidth: 60 })).toEqual({
			x: 5 * CHAR_WIDTH,
			y: LINE_HEIGHT,
			height: LINE_HEIGHT,
		});
	});

	it("gives a caret on a soft-wrap boundary to the line that starts there", () => {
		// Where the next character will be drawn, which is where the caret belongs.
		expect(offsetOf("a".repeat(30), 10, { contentWidth: 60 })).toEqual({
			x: 0,
			y: LINE_HEIGHT,
			height: LINE_HEIGHT,
		});
	});

	it("measures a styled stretch with the type size it is drawn at", () => {
		const text: RichText = [{ text: "AB", fontSize: 20 }, { text: "cd" }];

		// The bigger run is 12px per character and raises the whole line box.
		expect(offsetOf(text, 2)).toEqual({ x: 24, y: 0, height: 30 });
		expect(offsetOf(text, 4)).toEqual({
			x: 24 + 2 * CHAR_WIDTH,
			y: 0,
			height: 30,
		});
	});

	it("stacks lines by their own heights, not by one shared line height", () => {
		const text: RichText = [{ text: "AB\n", fontSize: 20 }, { text: "cd" }];

		// The first line is as tall as its 20px run; the second is the slot's own.
		expect(offsetOf(text, 4)).toEqual({
			x: CHAR_WIDTH,
			y: 30,
			height: LINE_HEIGHT,
		});
	});
});
