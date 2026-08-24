import type { TextMeasureFont } from "../../../measure/TextMeasureFont";

/**
 * The font the layout tests measure with. They run against the measurement the
 * package's vitest setup offers — `createEstimateTextMeasurement()`, characters ×
 * fontSize × 0.6 — since the wrapping algorithm is what is under test, not the
 * measurement. At fontSize 10 that is exactly {@link FALLBACK_CHAR_WIDTH} per
 * character, which is what the widths in those tests are chosen against.
 */
export const FALLBACK_FONT: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character of {@link FALLBACK_FONT} takes under the estimate. */
export const FALLBACK_CHAR_WIDTH = 6;
