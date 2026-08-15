import type { ObjectTextRegionCalculator } from "@jiscribe/canvas";
import type { TextSlot } from "@jiscribe/canvas/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { calcLabelBoxSize } from "./calcLabelBoxSize";

/** Empty band between the bottom edge of the box and the top of the label. */
export const BELOW_LABEL_GAP = 4;

/**
 * What the label layout reads off the state: the untransformed box size plus the
 * text slots, whose content sizes the label. Typed as the open slot map every
 * text-bearing state carries rather than one shape's own single slot, so the
 * registry's calculator type still accepts it (see ObjectTextRegionCalculator).
 */
type BelowLabelState = Dimensions & {
	/** The shape's text slots, keyed by slot id; an absent slot reads as empty. */
	text?: Record<string, TextSlot>;
};

/**
 * Places the label of a shape whose box is fully taken by its drawing: a box
 * sized from its own text (calcLabelBoxSize), centered under the bounding box.
 * Sizing the label from the text instead of from the box is what keeps it legible
 * when the drawing is scaled down — the two are independent, exactly as a
 * connector's label is independent of its path. The label has no maximum width:
 * it runs sideways past the shape until the author breaks it themselves.
 *
 * Register as such a shape's `textRegion`, so the drawn label (TextOverlay) and
 * the in-place editor resolve the same rectangle; while editing, the grafted
 * draft text (graftTextEditDraft) reaches here, so the box follows every
 * keystroke. Pair it with `calcBelowLabelVisualBounds`, or zoom-to-fit and the
 * export viewBox crop the label away.
 *
 * @param state The shape's box (width/height) and its text slots.
 * @param slotId Which slot to place; a shape with no such slot lays out an empty label.
 * @returns The label rectangle in local coordinates (shape center as origin), always below the box.
 */
export const calcBelowLabelTextRegion: ObjectTextRegionCalculator<
	BelowLabelState
> = (state, slotId) => {
	const { width, height } = calcLabelBoxSize(state.text, slotId);

	return {
		x: -width / 2,
		y: state.height / 2 + BELOW_LABEL_GAP,
		width,
		height,
	};
};
