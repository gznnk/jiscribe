import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import type { TextSlots } from "@jiscribe/canvas/unstable";
import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/doc/unstable";
import { describe, expect, it } from "vitest";

import { BELOW_LABEL_STYLE_DEFAULTS } from "../../schema/belowLabelStyleDefaults";
import { calcLabelBoxSize } from "../calcLabelBoxSize";

/**
 * Widths come from the non-browser fallback of the measurement (characters ×
 * fontSize × 0.6), so they are proportional rather than faithful — but they are
 * exact, which is what lets the sizes below be pinned rather than compared.
 */
const CHAR_WIDTH_RATIO = 0.6;

/** calcTextBlockSize's floor for a box holding no text (TEXT_BLOCK_MIN_WIDTH). */
const MIN_WIDTH = 16;

/** The fraction calcTextBlockSize adds so the browser's own layout cannot clip the last character (TEXT_BLOCK_WIDTH_SLACK). */
const WIDTH_SLACK = 2;

/** The box the longest line of `charCount` characters takes at `fontSize`. */
const expectedWidth = (charCount: number, fontSize: number): number =>
	Math.max(
		MIN_WIDTH,
		charCount * fontSize * CHAR_WIDTH_RATIO +
			TEXT_BOX_PADDING_X * 2 +
			WIDTH_SLACK,
	);

/** The box `lineCount` lines take at `fontSize`; an empty text is still one line. */
const expectedHeight = (lineCount: number, fontSize: number): number =>
	lineCount * fontSize * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

const slots = (slot: TextSlots[string]): TextSlots => ({
	[BODY_TEXT_SLOT_ID]: slot,
});

describe("calcLabelBoxSize", () => {
	// Every below-label shape sizes from here, so the fallback the drawing side
	// resolves (BELOW_LABEL_STYLE_DEFAULTS) has to be the one measured with
	it("sizes an absent slot as one empty line at the default font size", () => {
		expect(calcLabelBoxSize(undefined, BODY_TEXT_SLOT_ID)).toEqual({
			width: MIN_WIDTH,
			height: expectedHeight(1, BELOW_LABEL_STYLE_DEFAULTS.fontSize),
		});
	});

	it("sizes a slot that is not there like a shape holding no text at all", () => {
		expect(
			calcLabelBoxSize(slots({ text: "Customer" }), "no-such-slot"),
		).toEqual(calcLabelBoxSize(undefined, BODY_TEXT_SLOT_ID));
	});

	it("sizes an empty string as one empty line, down to the minimum width", () => {
		expect(calcLabelBoxSize(slots({ text: "" }), BODY_TEXT_SLOT_ID)).toEqual({
			width: MIN_WIDTH,
			height: expectedHeight(1, BELOW_LABEL_STYLE_DEFAULTS.fontSize),
		});
	});

	it("measures with the slot's own font size where it sets one, keeping the other fallbacks", () => {
		expect(
			calcLabelBoxSize(
				slots({ text: "Alpha", fontSize: 24 }),
				BODY_TEXT_SLOT_ID,
			),
		).toEqual({
			width: expectedWidth("Alpha".length, 24),
			height: expectedHeight(1, 24),
		});
	});

	it("widens to the longest line and heightens per authored newline", () => {
		expect(
			calcLabelBoxSize(slots({ text: "one\nthree" }), BODY_TEXT_SLOT_ID),
		).toEqual({
			width: expectedWidth("three".length, BELOW_LABEL_STYLE_DEFAULTS.fontSize),
			height: expectedHeight(2, BELOW_LABEL_STYLE_DEFAULTS.fontSize),
		});
	});
});
