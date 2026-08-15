import type { TextSlot } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas/unstable-doc";

/**
 * Typography the label falls back to for a field its slot leaves out, shared by
 * every shape that hangs its label under the box (calcBelowLabelTextRegion).
 * Spread into each shape's `*_DOC_DEFAULTS` as well, so a shape created from the
 * toolbar writes the same values into its doc.
 *
 * `fontSize` has to match TextOverlayFrame's own fallback (16). Those defaults
 * only reach a doc through the factory, so a doc written by hand or by an LLM
 * omits the field, and the label would then be measured with one size and drawn
 * with the other — a box too small for its text. `fontFamily` still carries that
 * mismatch, because the drawing side falls back to the theme font rather than to
 * a constant (#1).
 */
export const BELOW_LABEL_STYLE_DEFAULTS = {
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const satisfies Omit<TextSlot, "text">;
