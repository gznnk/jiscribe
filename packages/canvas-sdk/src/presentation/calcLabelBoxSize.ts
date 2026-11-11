import type { TextSlots } from "@jiscribe/canvas/unstable";
import type { TextSlotStyle } from "@jiscribe/doc";
import { calcLabelTextBoxSize, LABEL_TEXT_STYLE_DEFAULTS } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

/**
 * Size of the caption box a `features.text: "label"` or `"innerLabel"` shape
 * that places its caption itself (a `"label"` group marker's beyond its tip, an
 * `"innerLabel"` AWS group's band) sizes
 * from its own text: the measurement the core sizes a caption under the box
 * with (calcLabelTextBoxSize), so the box grows sideways with the longest line
 * and breaks only where the author typed a newline.
 *
 * The slot's own fields are measured over `typeDefaults`, which have to be the
 * defaults the type's doc declares for its body, or the box is measured in a
 * font the caption is not drawn in.
 *
 * @param text - The shape's text slots, keyed by slot id; undefined for a shape holding no text, which sizes an empty label
 * @param slotId - Which slot to measure; an absent slot measures as empty, yielding the minimum box rather than nothing
 * @param typeDefaults - The type's defaults for that slot; defaults to LABEL_TEXT_STYLE_DEFAULTS, which a type spreading them into its doc defaults can leave out
 * @returns The box size in local px, the text padding included. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcLabelBoxSize = (
	text: TextSlots | undefined,
	slotId: string,
	typeDefaults: TextSlotStyle = LABEL_TEXT_STYLE_DEFAULTS,
): Dimensions => calcLabelTextBoxSize(text?.[slotId], typeDefaults);
