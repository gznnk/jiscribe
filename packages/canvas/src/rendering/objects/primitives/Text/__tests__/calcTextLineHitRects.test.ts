import type { TextAlign } from "@jiscribe/doc/model/objects/types/TextAlign";
import { calcTextBlockSize } from "@jiscribe/doc/text/calcTextBlockSize";
import type { TextMeasureFont } from "@jiscribe/doc/text/measureText";
import { describe, expect, it } from "vitest";

import { calcTextLineHitRects } from "../calcTextLineHitRects";

/**
 * These run in the node environment, where there is no canvas to measure with:
 * every width comes from the documented fallback (characters × fontSize × 0.6).
 * With fontSize 10 that is exactly 6px per character, and one line is 15px tall.
 * The box each case is measured into comes from calcTextBlockSize, which is what
 * the object's own width/height are derived from.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character takes under the fallback measurement. */
const CHAR_WIDTH = 6;

/** Height of one line: fontSize × TEXT_LINE_HEIGHT. */
const LINE_HEIGHT = 15;

/** Padding and slack a band adds to the measured width of its line. */
const HORIZONTAL_EXTRA = 6 * 2 + 2;

/** Padding a band gains on the side of the box it touches. */
const EDGE_PADDING = 2;

/**
 * The bands of a text, measured into the box that text is sized to. Left-aligned
 * unless a case says otherwise, which is what a `text` object defaults to.
 */
const hitRectsOf = (text: string, textAlign: TextAlign = "left") =>
	calcTextLineHitRects(text, font, calcTextBlockSize(text, font), textAlign);

describe("calcTextLineHitRects", () => {
	it("covers the whole box with one band when there is no text to aim at", () => {
		const box = calcTextBlockSize("", font);
		expect(hitRectsOf("")).toEqual([
			{
				x: -box.width / 2,
				y: -box.height / 2,
				width: box.width,
				height: box.height,
			},
		]);
		// Every line empty is the same case: without this the object could be
		// neither selected nor deleted.
		expect(hitRectsOf("\n\n")).toEqual([
			{ x: -8, y: -24.5, width: 16, height: 49 },
		]);
	});

	it("gives a single line one band spanning its whole box", () => {
		const box = calcTextBlockSize("abc", font);
		expect(hitRectsOf("abc")).toEqual([
			{
				x: -box.width / 2,
				y: -box.height / 2,
				width: box.width,
				height: box.height,
			},
		]);
	});

	it("stops each band at its own line's glyphs, the widest reaching the box edge", () => {
		const box = calcTextBlockSize("abcdefghij\nab", font);
		const [firstLine, secondLine] = hitRectsOf("abcdefghij\nab");

		expect(firstLine.width).toBe(box.width);
		expect(secondLine.width).toBe(2 * CHAR_WIDTH + HORIZONTAL_EXTRA);
		// Both start at the box's left edge: the text is left-aligned.
		expect(firstLine.x).toBe(-box.width / 2);
		expect(secondLine.x).toBe(-box.width / 2);
	});

	it("follows the alignment, so a short line's band sits under its own glyphs", () => {
		const text = "abcdefghij\nab";
		const box = calcTextBlockSize(text, font);
		const shortBandWidth = 2 * CHAR_WIDTH + HORIZONTAL_EXTRA;

		const [, centered] = hitRectsOf(text, "center");
		expect(centered.x).toBe(-shortBandWidth / 2);

		const [, rightAligned] = hitRectsOf(text, "right");
		expect(rightAligned.x).toBe(box.width / 2 - shortBandWidth);

		// The longest line fills the box, so alignment cannot move it.
		expect(hitRectsOf(text, "center")[0].x).toBe(-box.width / 2);
		expect(hitRectsOf(text, "right")[0].x).toBe(-box.width / 2);
	});

	it("stacks the bands line by line, the outer two taking the box padding", () => {
		const box = calcTextBlockSize("ab\nabcd\nabcdef", font);
		const bands = hitRectsOf("ab\nabcd\nabcdef");

		expect(bands.map((band) => band.height)).toEqual([
			LINE_HEIGHT + EDGE_PADDING,
			LINE_HEIGHT,
			LINE_HEIGHT + EDGE_PADDING,
		]);
		// Contiguous from the top of the box to the bottom: the leading is inside
		// the bands, so there is no gap between lines to fall through.
		expect(bands[0].y).toBe(-box.height / 2);
		expect(bands[1].y).toBe(bands[0].y + bands[0].height);
		expect(bands[2].y).toBe(bands[1].y + bands[1].height);
		expect(bands[2].y + bands[2].height).toBe(box.height / 2);
	});

	it("leaves an empty line unpickable and holds the rest in place", () => {
		const box = calcTextBlockSize("a\n\nb", font);
		const bands = hitRectsOf("a\n\nb");

		expect(bands).toHaveLength(2);
		expect(bands[0].y).toBe(-box.height / 2);
		// The band of the third line sits where the third line is drawn, the
		// skipped one still taking its line height.
		expect(bands[1].y).toBe(-box.height / 2 + EDGE_PADDING + 2 * LINE_HEIGHT);
		expect(bands[1].y + bands[1].height).toBe(box.height / 2);
	});

	it("drops the padding of an outer line that has nothing to pick", () => {
		const bands = hitRectsOf("a\n");
		expect(bands).toHaveLength(1);
		expect(bands[0].height).toBe(LINE_HEIGHT + EDGE_PADDING);
	});

	it("keeps the bands inside a box narrower than the text", () => {
		const bands = calcTextLineHitRects("abcdefghij", font, {
			width: 20,
			height: 19,
		});
		expect(bands[0].width).toBe(20);
	});

	it("scales the bands with the font size", () => {
		const largerFont = { ...font, fontSize: 20 };
		const bands = calcTextLineHitRects(
			"ab\nab",
			largerFont,
			calcTextBlockSize("ab\nab", largerFont),
		);
		expect(bands.map((band) => band.height)).toEqual([32, 32]);
	});
});
