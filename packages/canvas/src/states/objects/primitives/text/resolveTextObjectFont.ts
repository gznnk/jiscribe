import { DEFAULT_FONT_FAMILY } from "../../../../constants/fontFamilies";
import { TEXT_STYLE_FALLBACK } from "../../../../constants/textStyleFallback";
import type { TextSlot } from "../../../../schemas/objects/types/TextSlot";
import type { TextMeasureFont } from "../../../../text/measureText";

/** The styling a text object's box is measured from — the style half of a slot, all of it optional. */
export type TextObjectTypography = Pick<
	TextSlot,
	"fontSize" | "fontFamily" | "fontWeight" | "fontStyle"
>;

/**
 * The font a `text` object's body is drawn — and therefore measured — with. The
 * single place the overlay's own defaults are filled in, so measuring the box
 * and measuring its lines can never disagree about the font. What the type
 * itself declares is resolved before this (resolveTextSlotStyle); what is left
 * falls to the shared last resort the overlay draws with (TEXT_STYLE_FALLBACK,
 * and DEFAULT_FONT_FAMILY for the family, which lives outside it because it is
 * shared with doc creation).
 *
 * @param typography - The object's own text styling, the type's defaults already resolved into it; each still-unset field falls back to what the overlay draws with
 * @returns The resolved font, ready for measureTextWidth / calcTextBlockSize
 */
export const resolveTextObjectFont = (
	typography: TextObjectTypography,
): TextMeasureFont => ({
	fontSize: typography.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
	fontFamily: typography.fontFamily ?? DEFAULT_FONT_FAMILY,
	fontWeight: typography.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
	fontStyle: typography.fontStyle,
});
