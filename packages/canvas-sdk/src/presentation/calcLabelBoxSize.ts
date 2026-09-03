import type { TextSlots } from "@jiscribe/canvas/unstable";
import { calcTextBlockSize, readRichTextSlot } from "@jiscribe/canvas/unstable";
import type { Dimensions } from "@jiscribe/geometry";

import { BELOW_LABEL_STYLE_DEFAULTS } from "../schema/belowLabelStyleDefaults";

/**
 * Size of the label box a shape sizes from its own text rather than from its box:
 * the text laid out as authored, so the box grows sideways with the longest line
 * and breaks only where the author typed a newline (calcTextBlockSize). Part of
 * the label drawn larger widens and heightens its own line, so a label styled per
 * range still gets a box that holds it.
 *
 * The one measurement behind every such label, whichever side of the shape it
 * hangs off (calcBelowLabelTextRegion, calcGroupMarkerTextRegion): a placement
 * only has to decide where to put the box this returns. The typography it is
 * measured with is BELOW_LABEL_STYLE_DEFAULTS under the slot's own fields, which
 * is what the drawing side resolves too, the family included: both fall back to
 * BELOW_LABEL_STYLE_DEFAULTS, which is DEFAULT_FONT_FAMILY.
 *
 * @param text - The shape's text slots, keyed by slot id; undefined for a shape holding no text, which sizes an empty label
 * @param slotId - Which slot to measure; an absent slot measures as empty, yielding the minimum box rather than nothing
 * @returns The box size in local px, the text padding included. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcLabelBoxSize = (
	text: TextSlots | undefined,
	slotId: string,
): Dimensions => {
	const slot = text?.[slotId];
	return calcTextBlockSize(readRichTextSlot(text, slotId), {
		fontSize: slot?.fontSize ?? BELOW_LABEL_STYLE_DEFAULTS.fontSize,
		fontFamily: slot?.fontFamily ?? BELOW_LABEL_STYLE_DEFAULTS.fontFamily,
		fontWeight: slot?.fontWeight ?? BELOW_LABEL_STYLE_DEFAULTS.fontWeight,
		fontStyle: slot?.fontStyle,
	});
};
