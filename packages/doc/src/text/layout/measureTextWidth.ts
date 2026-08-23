import { createOffsetMeasurer } from "./textOffsets";
import type { RichText } from "../../model/objects/types/RichText";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/**
 * Rendered width of a single line, in the same local pixels as `fontSize`. In a
 * browser it is measured on an offscreen canvas, so it can run every frame
 * without triggering DOM layout.
 *
 * @param text - One line; an embedded newline is measured as an ordinary character rather than starting a new line
 * @param font - Font the text is drawn with; a family other than the drawn one skews the result
 * @returns The width under the adopted measurement, which throws if the host has offered none (`offerTextMeasurement`)
 */
export const measureTextWidth = (
	text: RichText,
	font: TextMeasureFont,
): number => {
	const { plain, measurer } = createOffsetMeasurer(text, font);
	return measurer.width(0, plain.length);
};
