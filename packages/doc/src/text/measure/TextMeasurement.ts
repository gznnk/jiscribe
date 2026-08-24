import type { TextMeasureFont } from "./TextMeasureFont";
import type { TextWidthMeasurer } from "./textWidthMeasurer";

/**
 * Where an implementation's widths come from. The three names are the ordering
 * itself — `renderer` (the engine that will draw the text, measuring itself)
 * beats `font-metrics` (the drawn faces read from their font files), which beats
 * `estimate` (character count) — because measurement has to agree with drawing,
 * which is a fact about the process rather than a preference a host may express.
 */
export type TextMeasurementSource = "renderer" | "font-metrics" | "estimate";

/**
 * One way of measuring text width, offered to the process-wide slot
 * (`offerTextMeasurement`) by whoever can supply it. The layout never picks
 * between implementations: it takes whichever one the slot adopted.
 */
export type TextMeasurement = {
	/** The implementation's own account of where its widths come from. */
	source: TextMeasurementSource;
	/**
	 * Builds the measurer for one font. Called once per styled run per layout
	 * pass, so per-font work (resolving a face, parsing a shorthand) belongs here
	 * rather than in the measurer it returns.
	 */
	createMeasurer(font: TextMeasureFont): TextWidthMeasurer;
};

/** What the canvas charged a character before the estimate was named as one. */
const DEFAULT_CHAR_WIDTH_RATIO = 0.6;

/**
 * Measurement that charges every character the same fraction of the type size,
 * for a host with neither a drawing engine nor the font files — a unit test, in
 * practice. The wrapping it produces is proportional, not faithful: no face is
 * read, so `i` and `W` measure alike and a fullwidth character measures as a
 * halfwidth one does.
 *
 * @param charWidthRatio - Width one character is charged, as a fraction of the font size; the default 0.6 is what the canvas silently fell back to before this had a name
 * @returns A measurement naming itself `estimate`, the lowest of the three sources, so a real implementation offered before the first measurement replaces it
 */
export const createEstimateTextMeasurement = (
	charWidthRatio: number = DEFAULT_CHAR_WIDTH_RATIO,
): TextMeasurement => ({
	source: "estimate",
	createMeasurer:
		(font: TextMeasureFont): TextWidthMeasurer =>
		(text) =>
			text.length * font.fontSize * charWidthRatio,
});
