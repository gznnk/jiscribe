import { describe, expect, it } from "vitest";

import { measureUnder } from "../../measure/__tests__/support/measureUnder";
import { layoutVisualLines } from "../layoutVisualLines";
import { TEXT_LINE_HEIGHT } from "../textLineHeight";
import { FALLBACK_CHAR_WIDTH, FALLBACK_FONT } from "./support/fallbackFont";

/** The CJK punctuation a browser trims the space between when two of them meet. */
const TUCKED_PUNCTUATION = "、。「」";

/**
 * Half of {@link FALLBACK_CHAR_WIDTH}: what a browser takes off a pair of
 * adjacent CJK punctuation marks (`text-spacing-trim`, half an em).
 */
const TUCK_WIDTH = FALLBACK_CHAR_WIDTH / 2;

/**
 * Measures like {@link FALLBACK_FONT} does, except that two adjacent punctuation
 * marks inside the measured string take {@link TUCK_WIDTH} less together. The
 * tuck is a property of the pair, so it shows up only when both marks are in the
 * same call — which is what makes measuring piece by piece overstate a line.
 */
const measureWithTuckedPunctuation = (text: string): number => {
	let tucks = 0;
	for (let index = 1; index < text.length; index += 1) {
		if (
			TUCKED_PUNCTUATION.includes(text[index - 1]) &&
			TUCKED_PUNCTUATION.includes(text[index])
		) {
			tucks += 1;
		}
	}
	return text.length * FALLBACK_CHAR_WIDTH - tucks * TUCK_WIDTH;
};

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

describe("layoutVisualLines with punctuation the font tucks", () => {
	measureUnder({
		source: "estimate",
		createMeasurer: () => measureWithTuckedPunctuation,
	});

	it("keeps a line that fits when measured whole on one line", () => {
		// Two tucked pairs (、「 and 」。), so the line measures 36 whole against
		// the 42 its seven characters add up to one at a time.
		const text = "あ、「い」。う";

		expect(layoutVisualLines(text, FALLBACK_FONT, 36)).toEqual([
			{
				start: 0,
				end: text.length,
				width: 36,
				height: FALLBACK_FONT.fontSize * TEXT_LINE_HEIGHT,
			},
		]);
	});

	it("still breaks the line the tucks do not save", () => {
		expect(
			layoutVisualLines("あ、「い」。う", FALLBACK_FONT, 35).map(
				(line) => line.width,
			),
		).toEqual([30, 6]);
	});
});
