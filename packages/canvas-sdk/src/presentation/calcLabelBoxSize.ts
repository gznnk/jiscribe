import type { TextSlots } from "@jiscribe/canvas/unstable";
import { calcLabelTextBoxSize } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { BELOW_LABEL_STYLE_DEFAULTS } from "../schema/belowLabelStyleDefaults";

/**
 * Size of the label box a `features.text: "body"` shape sizes from its own text
 * rather than from its box, for a shape that places that box itself (a group
 * marker's beyond its tip, an AWS group's band): the measurement a `"label"`
 * caption is sized with (calcLabelTextBoxSize), so the box grows sideways with
 * the longest line and breaks only where the author typed a newline.
 *
 * Measured with BELOW_LABEL_STYLE_DEFAULTS under the slot's own fields, the
 * defaults such a shape spreads into its doc — the family included, which is
 * DEFAULT_FONT_FAMILY, the one an unset family is drawn in.
 *
 * @param text - The shape's text slots, keyed by slot id; undefined for a shape holding no text, which sizes an empty label
 * @param slotId - Which slot to measure; an absent slot measures as empty, yielding the minimum box rather than nothing
 * @returns The box size in local px, the text padding included. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcLabelBoxSize = (
	text: TextSlots | undefined,
	slotId: string,
): Dimensions =>
	calcLabelTextBoxSize(text?.[slotId], BELOW_LABEL_STYLE_DEFAULTS);
