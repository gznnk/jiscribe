import type { Dimensions } from "@workspace/geometry";

import { calcActorTextRegion } from "./calcActorTextRegion";
import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import type { TextSlot } from "../../../../schemas/objects/types/TextSlot";
import { readTextSlot } from "../../../../states/objects/types/TextSlots";
import type { ObjectVisualBoundsCalculator } from "../../registry/ObjectVisualBoundsRegistry";

/** The box the figure fills, plus the slot the label is derived from. */
type ActorVisualBoundsState = Dimensions & {
	/** The shape's text slots, keyed by slot id; an absent body slot means no label. */
	text?: Record<string, TextSlot>;
};

/**
 * The actor's drawn extent: the box the stick figure fills, widened downwards by
 * the label hung under it (calcActorTextRegion). An empty label draws nothing, so
 * it contributes no extent — otherwise every actor would reserve a band of empty
 * space below itself in zoom-to-fit and the export viewBox.
 */
export const calcActorVisualBounds: ObjectVisualBoundsCalculator<
	ActorVisualBoundsState
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

	const label = calcActorTextRegion(state, BODY_TEXT_SLOT_ID);
	const left = Math.min(figure.x, label.x);
	const top = Math.min(figure.y, label.y);
	const right = Math.max(figure.x + figure.width, label.x + label.width);
	const bottom = Math.max(figure.y + figure.height, label.y + label.height);
	return { x: left, y: top, width: right - left, height: bottom - top };
};
