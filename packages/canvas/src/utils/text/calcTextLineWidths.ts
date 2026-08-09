import type { TextMeasureFont } from "./measureText";
import { measureTextWidth } from "./measureText";

/**
 * Rendered width of each line of a text laid out as authored: lines break at
 * `\n` and nowhere else, so no line is ever wrapped and the array is as long as
 * the authored line count. The largest element is the width the enclosing box
 * has to reach (calcTextBlockSize), and each element on its own is how far the
 * glyphs of that line extend from the box's left edge (calcTextLineHitRects).
 *
 * @param text - The whole text, authored newlines included; an empty string yields one width, and an empty line measures 0
 * @param font - Font the text is drawn with; a family other than the drawn one skews every width
 * @returns One width per line in authored order, in the same local pixels as `fontSize`, never empty. Outside a browser the widths are the estimate measureTextWidth falls back to
 */
export const calcTextLineWidths = (
	text: string,
	font: TextMeasureFont,
): number[] => text.split("\n").map((line) => measureTextWidth(line, font));
