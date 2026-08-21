import type { TextMeasureFont } from "../../../measure/TextMeasureFont";

/**
 * The font the layout tests measure with. They run in the node environment,
 * where there is no `document` and therefore no canvas to measure with: every
 * width comes from the documented fallback (characters × fontSize × 0.6). At
 * fontSize 10 that is exactly {@link FALLBACK_CHAR_WIDTH} per character, which is
 * what the widths in those tests are chosen against — the wrapping algorithm is
 * what is under test, not the measurement.
 */
export const FALLBACK_FONT: TextMeasureFont = {
	fontSize: 10,
	fontFamily: "Noto Sans JP",
	fontWeight: "normal",
};

/** Width one character of {@link FALLBACK_FONT} takes under the fallback measurement. */
export const FALLBACK_CHAR_WIDTH = 6;
