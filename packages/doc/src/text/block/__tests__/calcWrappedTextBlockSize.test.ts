import { describe, expect, it } from "vitest";

import {
	FALLBACK_CHAR_WIDTH,
	FALLBACK_FONT,
} from "../../layout/__tests__/support/fallbackFont";
import { calcWrappedTextBlockSize } from "../calcWrappedTextBlockSize";

/** Padding the box adds around the wrapped text, left+right and top+bottom. */
const HORIZONTAL_PADDING = 6 * 2;
const VERTICAL_PADDING = 2 * 2;

/** Height of a box holding `lineCount` lines of {@link FALLBACK_FONT}. */
const expectedHeight = (lineCount: number): number =>
	lineCount * 10 * 1.5 + VERTICAL_PADDING;

/** Box width fitting exactly `charCount` characters of {@link FALLBACK_FONT}. */
const widthFor = (charCount: number): number =>
	charCount * FALLBACK_CHAR_WIDTH + HORIZONTAL_PADDING;

describe("calcWrappedTextBlockSize", () => {
	it("hands the given width back, whatever the text does inside it", () => {
		expect(calcWrappedTextBlockSize("", FALLBACK_FONT, 240).width).toBe(240);
		expect(
			calcWrappedTextBlockSize("a".repeat(500), FALLBACK_FONT, 240).width,
		).toBe(240);
	});

	it("sizes an empty text to one line", () => {
		expect(calcWrappedTextBlockSize("", FALLBACK_FONT, 240)).toEqual({
			width: 240,
			height: expectedHeight(1),
		});
	});

	it("takes one line per wrapped line, not per authored one", () => {
		// Ten characters of room, four words of five: two words per line.
		const size = calcWrappedTextBlockSize(
			"aaaa bbbb cccc dddd",
			FALLBACK_FONT,
			widthFor(10),
		);

		expect(size.height).toBe(expectedHeight(2));
	});

	it("grows the height as the width narrows, the text unchanged", () => {
		const text = "aaaa bbbb cccc dddd";
		const wide = calcWrappedTextBlockSize(text, FALLBACK_FONT, widthFor(20));
		const narrow = calcWrappedTextBlockSize(text, FALLBACK_FONT, widthFor(5));

		expect(wide.height).toBe(expectedHeight(1));
		expect(narrow.height).toBe(expectedHeight(4));
	});

	it("counts an authored newline on top of the wrapping", () => {
		const size = calcWrappedTextBlockSize(
			"aaaa bbbb\ncccc",
			FALLBACK_FONT,
			widthFor(5),
		);

		expect(size.height).toBe(expectedHeight(3));
	});

	it("breaks a word too long for the width between characters", () => {
		const size = calcWrappedTextBlockSize(
			"a".repeat(15),
			FALLBACK_FONT,
			widthFor(5),
		);

		expect(size.height).toBe(expectedHeight(3));
	});

	it("wraps at one pixel of content when the width leaves none", () => {
		// Every character takes a line of its own rather than the box collapsing.
		const size = calcWrappedTextBlockSize("abc", FALLBACK_FONT, 0);

		expect(size).toEqual({ width: 0, height: expectedHeight(3) });
	});

	it("heightens the line a larger run is drawn on", () => {
		const text = [{ text: "aa " }, { text: "bb", fontSize: 40 }];

		// Room for the 40px run alone (2 characters × 24px), so it wraps whole.
		const size = calcWrappedTextBlockSize(text, FALLBACK_FONT, widthFor(8));

		// "aa" on a 10px line, the 40px run wrapped onto a line of its own.
		expect(size.height).toBe(10 * 1.5 + 40 * 1.5 + VERTICAL_PADDING);
	});
});
