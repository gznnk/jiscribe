import type { TextSlot } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
} from "@workspace/canvas/unstable-doc";

/**
 * Typography the label falls back to for a field its slot leaves out, shared by
 * every pictogram that hangs its label under the box (calcBelowLabelTextRegion).
 * Spread into each shape's `*_DOC_DEFAULTS`, so the font the label box is
 * measured with cannot differ from the one it is drawn with. Smaller than the
 * in-shape default (16) because an outside label reads as a caption.
 */
export const BELOW_LABEL_STYLE_DEFAULTS = {
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const satisfies Omit<TextSlot, "text">;
