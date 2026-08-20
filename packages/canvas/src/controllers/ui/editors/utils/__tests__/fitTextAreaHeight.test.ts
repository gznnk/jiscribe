import { describe, expect, it } from "vitest";

import { TEXT_LINE_HEIGHT } from "../../../../../constants/textLineHeight";
import { calcTextAreaHeight } from "../fitTextAreaHeight";

/** The vertical padding TextEditorStyled / ConnectorLabelEditorStyled declare. */
const PADDING = 4;

/** The height the display side draws for the same content. */
const displayHeight = (lineCount: number, fontSize: number): number =>
	lineCount * fontSize * TEXT_LINE_HEIGHT + PADDING;

describe("calcTextAreaHeight", () => {
	it("keeps a whole-pixel measurement as it is", () => {
		// fontSize 16 gives a 24px line box, so the measurement is already exact.
		expect(calcTextAreaHeight(28, 16, PADDING)).toBe(displayHeight(1, 16));
		expect(calcTextAreaHeight(52, 16, PADDING)).toBe(displayHeight(2, 16));
	});

	it("restores the fraction a rounded measurement lost", () => {
		// fontSize 15 gives a 22.5px line box: the browser reports 27 for a box
		// that is really 26.5 tall, which is what shifted the text.
		expect(calcTextAreaHeight(27, 15, PADDING)).toBe(displayHeight(1, 15));
		expect(calcTextAreaHeight(49, 15, PADDING)).toBe(displayHeight(2, 15));
		expect(calcTextAreaHeight(71, 15, PADDING)).toBe(displayHeight(3, 15));
	});

	it("recovers the line count whichever way the measurement was rounded", () => {
		expect(calcTextAreaHeight(26, 15, PADDING)).toBe(displayHeight(1, 15));
		expect(calcTextAreaHeight(27, 15, PADDING)).toBe(displayHeight(1, 15));
	});

	it("takes the measurement when the content stands above whole line boxes", () => {
		// A line drawn in two font families is about a pixel taller than
		// fontSize × 1.5; rebuilding from the line count would round that away and
		// leave the editor scrolling inside it.
		expect(calcTextAreaHeight(29, 16, PADDING)).toBe(29);
	});

	it("keeps one line when the measurement is only the padding", () => {
		expect(calcTextAreaHeight(PADDING, 16, PADDING)).toBe(displayHeight(1, 16));
	});

	it("leaves only the padding when the type size has no height", () => {
		expect(calcTextAreaHeight(20, 0, PADDING)).toBe(PADDING);
	});

	it("agrees with the display height at every type size in the menu's range", () => {
		for (let fontSize = 1; fontSize <= 72; fontSize++) {
			for (const lineCount of [1, 2, 5]) {
				const exact = displayHeight(lineCount, fontSize);
				expect(calcTextAreaHeight(Math.round(exact), fontSize, PADDING)).toBe(
					exact,
				);
			}
		}
	});
});
