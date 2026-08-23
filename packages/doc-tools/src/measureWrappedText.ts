import type { RichText } from "@jiscribe/doc";
import type { TextMeasureFont, VisualLine } from "@jiscribe/doc/unstable";
import {
	layoutVisualLines,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";

import { nodeTextMeasurement } from "./measure/nodeTextMeasurer";

export type { TextMeasureFont };

/**
 * Makes the font files this package ships the ones the document layer measures
 * against, for a caller reaching a layout of the doc layer's own
 * (`calcAutoShapeHeight`) rather than going through this module. Idempotent, and
 * cheap enough to call on every entry point. Package-internal.
 */
export const offerNodeTextMeasurement = (): void => {
	offerTextMeasurement(nodeTextMeasurement());
};

/**
 * The drawn lines themselves, which {@link measureWrappedText} adds up: the same
 * layout, kept whole for a caller that needs where each line starts rather than
 * how much room they take. Package-internal — the metrics are what this package
 * publishes.
 *
 * @param text - The whole text, authored newlines included
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field
 * @param availableWidth - Content width to wrap in, in local pixels; `undefined` breaks at newlines alone
 */
export const layoutTextLines = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): VisualLine[] => {
	offerNodeTextMeasurement();
	return layoutVisualLines(text, font, availableWidth);
};

/** The box a text takes once wrapped, in the same local pixels as the font size. */
export type WrappedTextMetrics = {
	/** Drawn lines, authored newlines and automatic wraps alike; never below 1. */
	lines: number;
	/** Width of the longest drawn line, which is at most the width wrapped at. */
	width: number;
	/** The line boxes added up, a part drawn larger making its own line taller. */
	height: number;
};

/**
 * The lines a text is drawn as and the box they take, wrapped as the canvas
 * wraps it: `white-space: pre-wrap; word-break: break-word`, with CJK breaking
 * between characters. The same code the browser runs
 * (`@jiscribe/canvas` layoutVisualLines), measured against the font files this
 * package ships — so for a family the canvas ships, the answer is the one the
 * drawing gives, not an estimate.
 *
 * Pass the width the text really wraps at, which for text inside a shape is
 * {@link import("./resolveContentBox").resolveContentBox}'s region rather than the shape's own.
 *
 * @param text - The whole text, authored newlines included; a plain string, or the runs it is styled in where parts of it are drawn differently
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family outside the shipped set is estimated at 0.6em per character
 * @param availableWidth - Content width to wrap in, in local pixels; anything below 1 is treated as 1, and `undefined` lays the text out as authored, breaking only at newlines
 * @returns Line count and the box the lines take; an empty text is one empty line of the font's own height
 */
export const measureWrappedText = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): WrappedTextMetrics =>
	calcWrappedTextMetrics(layoutTextLines(text, font, availableWidth));

/**
 * The box a set of already laid-out lines takes, for a caller holding the lines
 * for another reason and not wanting to lay them out twice. Package-internal.
 *
 * @param lines - The drawn lines in order, as {@link layoutTextLines} returns them; an empty list yields a zero box, which no layout produces
 */
export const calcWrappedTextMetrics = (
	lines: readonly VisualLine[],
): WrappedTextMetrics => ({
	lines: lines.length,
	width: lines.reduce((widest, line) => Math.max(widest, line.width), 0),
	height: lines.reduce((total, line) => total + line.height, 0),
});
