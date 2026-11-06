import type { TextSlotStyle } from "../../model/objects/types/text/TextSlot";
import { AUTO_COLOR } from "../../model/objects/utils/autoColor";
import { DEFAULT_FONT_FAMILY } from "../style/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "../style/textStyleFallback";

/**
 * Creation typography of a caption hung below the box (`features.text:
 * "label"`): what a `"label"` type spreads into its `*_DOC_DEFAULTS`, so a shape
 * created from the toolbar writes these into its doc. Centred, in the theme's
 * ink, at the size and weight an unstyled text is drawn with; no
 * `verticalAlign`, a caption sized from its text having nowhere to place its
 * block (`textStyleKeysOf`).
 *
 * The size, weight and family are the shared last resort's, so a doc written by
 * hand that leaves them out is drawn and measured with the same values as one
 * the factory wrote.
 */
export const LABEL_TEXT_STYLE_DEFAULTS = {
	textAlign: TEXT_STYLE_FALLBACK.textAlign,
	fontColor: AUTO_COLOR,
	fontSize: TEXT_STYLE_FALLBACK.fontSize,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: TEXT_STYLE_FALLBACK.fontWeight,
} as const satisfies Omit<TextSlotStyle, "verticalAlign">;
