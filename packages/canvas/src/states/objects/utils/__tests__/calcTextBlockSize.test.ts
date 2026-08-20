import { describe, expect, it } from "vitest";

import { calcTextBlockSize } from "../calcTextBlockSize";
import type { TextMeasureFont } from "../measureText";

/**
 * These run in the node environment, where there is no canvas to measure with:
 * every width comes from the documented fallback (characters × fontSize × 0.6).
 * With fontSize 10 that is exactly 6px per character. The assertions below are
 * about how the size is composed, not about the measurement being faithful.
 */
const font: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character takes under the fallback measurement. */
const CHAR_WIDTH = 6;

/** Padding and slack the box adds around the measured text. */
const HORIZONTAL_EXTRA = 6 * 2 + 2;
const VERTICAL_EXTRA = 2 * 2;

/** Height of a box holding `lineCount` lines of the test font. */
const expectedHeight = (lineCount: number): number =>
	lineCount * 10 * 1.5 + VERTICAL_EXTRA;

describe("calcTextBlockSize", () => {
	it("sizes an empty text to one line at the minimum width", () => {
		expect(calcTextBlockSize("", font)).toEqual({
			width: 16,
			height: expectedHeight(1),
		});
	});

	it("widens with the longest line and adds padding to it", () => {
		const { width } = calcTextBlockSize("abcdefghij", font);
		expect(width).toBe(10 * CHAR_WIDTH + HORIZONTAL_EXTRA);
	});

	it("takes the width of the longest line, not the last one", () => {
		const longestFirst = calcTextBlockSize("abcdefghij\nab", font);
		const longestLast = calcTextBlockSize("ab\nabcdefghij", font);
		expect(longestFirst.width).toBe(10 * CHAR_WIDTH + HORIZONTAL_EXTRA);
		expect(longestLast.width).toBe(longestFirst.width);
	});

	it("grows the height by one line per authored newline", () => {
		expect(calcTextBlockSize("a\nb\nc", font).height).toBe(expectedHeight(3));
		expect(calcTextBlockSize("a\n\nb", font).height).toBe(expectedHeight(3));
		expect(calcTextBlockSize("a\n", font).height).toBe(expectedHeight(2));
	});

	it("never wraps, so a long line grows the width instead of the height", () => {
		const long = "a".repeat(500);
		const size = calcTextBlockSize(long, font);
		expect(size.width).toBe(500 * CHAR_WIDTH + HORIZONTAL_EXTRA);
		expect(size.height).toBe(expectedHeight(1));
	});

	it("applies the minimum width only while it exceeds the measured one", () => {
		expect(calcTextBlockSize("\n\n", font).width).toBe(16);
		expect(calcTextBlockSize("a", font).width).toBe(
			CHAR_WIDTH + HORIZONTAL_EXTRA,
		);
	});

	it("heightens a line drawn in a second font family", () => {
		// The browser's line box is the baseline-aligned union of its inline boxes,
		// so a second family reaches past fontSize × 1.5. At this type size the
		// allowance is its 1px floor rather than the 0.05em share.
		const mixed = [{ text: "ab" }, { text: "cd", fontFamily: "Some Other" }];

		expect(calcTextBlockSize(mixed, font).height).toBe(expectedHeight(1) + 1);
	});

	it("leaves a line whose runs all keep the slot's family alone", () => {
		const uniform = [
			{ text: "ab" },
			{ text: "cd", fontFamily: font.fontFamily },
		];

		expect(calcTextBlockSize(uniform, font).height).toBe(expectedHeight(1));
	});

	it("heightens only the line that mixes families", () => {
		const text = [{ text: "ab\n" }, { text: "cd", fontFamily: "Some Other" }];

		expect(calcTextBlockSize(text, font).height).toBe(expectedHeight(2) + 1);
	});

	it("takes the allowance as a share of the type size once that exceeds a pixel", () => {
		const mixed = [{ text: "ab" }, { text: "cd", fontFamily: "Some Other" }];
		const large = { ...font, fontSize: 40 };

		// 40 × 0.05 = 2, past the floor.
		expect(calcTextBlockSize(mixed, large).height).toBe(
			40 * 1.5 + VERTICAL_EXTRA + 2,
		);
	});

	it("measures an empty last line in the typography it opens from", () => {
		// Enter at the end of a larger run leaves the browser drawing that line at
		// the run's size, so measuring it at the slot's comes up a line short.
		const openedFromLarger = [{ text: "ab\n", fontSize: 40 }];

		expect(calcTextBlockSize(openedFromLarger, font).height).toBe(
			2 * 40 * 1.5 + VERTICAL_EXTRA,
		);
	});

	it("counts the family an empty last line opens from as a second one", () => {
		const openedFromOtherFamily = [{ text: "ab\n", fontFamily: "Some Other" }];

		// Both lines sit in the run, so both take the allowance.
		expect(calcTextBlockSize(openedFromOtherFamily, font).height).toBe(
			expectedHeight(2) + 2,
		);
	});

	it("leaves a break at the very start with nothing to inherit", () => {
		const leadingBreak = [{ text: "\nab", fontSize: 40 }];

		// The first line opens the text rather than a run, so it keeps the slot's
		// size; only the second line is drawn at 40.
		expect(calcTextBlockSize(leadingBreak, font).height).toBe(
			10 * 1.5 + 40 * 1.5 + VERTICAL_EXTRA,
		);
	});

	it("scales the height with the font size", () => {
		const larger = calcTextBlockSize("a\nb", { ...font, fontSize: 20 });
		expect(larger.height).toBe(2 * 20 * 1.5 + VERTICAL_EXTRA);
	});
});
