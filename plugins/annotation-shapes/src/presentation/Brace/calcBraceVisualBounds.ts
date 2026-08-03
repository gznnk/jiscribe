import type { ObjectVisualBoundsCalculator } from "@workspace/canvas";
import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { readTextSlot } from "@workspace/canvas/unstable";
import type { Dimensions } from "@workspace/geometry";

import { calcBraceTextRegion } from "./calcBraceTextRegion";
import type { BraceDirection } from "../../schema/brace/BraceDoc";

/** The box the bracket fills, plus what the label is derived from. */
type BraceVisualBoundsState = Dimensions & {
	/** Which way the tip points; the label hangs off that side. */
	direction?: BraceDirection;
	/** Where the tip sits along the span, 0..1. */
	tipPosition?: number;
	/** The shape's text slots, keyed by slot id; an absent body slot means no label. */
	text?: Record<string, TextSlot>;
};

/**
 * The drawn extent of a brace: the box the bracket fills, widened towards the
 * tip by the label (calcBraceTextRegion). An empty label draws nothing, so it
 * contributes no extent — otherwise every brace would reserve a band of empty
 * space beside itself in zoom-to-fit and the export viewBox.
 *
 * @param state The shape's box, tip placement, and text slots.
 * @returns The union of box and label in local coordinates (shape center as origin).
 */
export const calcBraceVisualBounds: ObjectVisualBoundsCalculator<
	BraceVisualBoundsState
> = (state) => {
	const bracket = {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};

	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return bracket;
	}

	const label = calcBraceTextRegion(state, BODY_TEXT_SLOT_ID);
	const left = Math.min(bracket.x, label.x);
	const top = Math.min(bracket.y, label.y);
	const right = Math.max(bracket.x + bracket.width, label.x + label.width);
	const bottom = Math.max(bracket.y + bracket.height, label.y + label.height);
	return { x: left, y: top, width: right - left, height: bottom - top };
};
