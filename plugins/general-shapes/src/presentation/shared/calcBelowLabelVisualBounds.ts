import type { ObjectVisualBoundsCalculator } from "@workspace/canvas";
import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { readTextSlot } from "@workspace/canvas/unstable";
import type { Dimensions } from "@workspace/geometry";

import { calcBelowLabelTextRegion } from "./calcBelowLabelTextRegion";

/** The box the drawing fills, plus the slot the label is derived from. */
type BelowLabelVisualBoundsState = Dimensions & {
	/** The shape's text slots, keyed by slot id; an absent body slot means no label. */
	text?: Record<string, TextSlot>;
};

/**
 * The drawn extent of a below-label pictogram: the box its drawing fills,
 * widened downwards by the label hung under it (calcBelowLabelTextRegion). An
 * empty label draws nothing, so it contributes no extent — otherwise every such
 * shape would reserve a band of empty space below itself in zoom-to-fit and the
 * export viewBox.
 *
 * @param state The shape's box (width/height) and its text slots.
 * @returns The union of box and label in local coordinates (shape center as origin).
 */
export const calcBelowLabelVisualBounds: ObjectVisualBoundsCalculator<
	BelowLabelVisualBoundsState
> = (state) => {
	const figure = {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};

	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return figure;
	}

	const label = calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
	const left = Math.min(figure.x, label.x);
	const top = Math.min(figure.y, label.y);
	const right = Math.max(figure.x + figure.width, label.x + label.width);
	const bottom = Math.max(figure.y + figure.height, label.y + label.height);
	return { x: left, y: top, width: right - left, height: bottom - top };
};
