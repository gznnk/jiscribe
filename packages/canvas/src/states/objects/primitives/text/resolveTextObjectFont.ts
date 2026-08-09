import type { TextSlot } from "../../../../schemas/objects/types/TextSlot";
import type { TextMeasureFont } from "../../utils/measureText";

/** Type size measured with when the object sets none; TextOverlayFrame's own default. */
const FALLBACK_FONT_SIZE = 16;

/** Weight measured with when the object sets none; TextOverlayFrame's own default. */
const FALLBACK_FONT_WEIGHT = "normal";

/** The styling a text object's box is measured from — the style half of a slot, all of it optional. */
export type TextObjectTypography = Pick<
	TextSlot,
	"fontSize" | "fontFamily" | "fontWeight" | "fontStyle"
>;

/**
 * The font a `text` object's body is drawn — and therefore measured — with. The
 * single place the overlay's own defaults are filled in, so measuring the box
 * and measuring its lines can never disagree about the font.
 *
 * @param typography - The object's own text styling; each unset field falls back to what the overlay draws with
 * @param fallbackFontFamily - Family used when `typography.fontFamily` is unset. Pass the family the text is actually drawn in (the host theme's), or every measurement comes out a few percent narrow
 * @returns The resolved font, ready for measureTextWidth / calcTextBlockSize
 */
export const resolveTextObjectFont = (
	typography: TextObjectTypography,
	fallbackFontFamily: string,
): TextMeasureFont => ({
	fontSize: typography.fontSize ?? FALLBACK_FONT_SIZE,
	fontFamily: typography.fontFamily ?? fallbackFontFamily,
	fontWeight: typography.fontWeight ?? FALLBACK_FONT_WEIGHT,
	fontStyle: typography.fontStyle,
});
