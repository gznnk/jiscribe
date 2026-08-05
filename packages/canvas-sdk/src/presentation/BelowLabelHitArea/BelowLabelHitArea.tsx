import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import type { TextSlot } from "@workspace/canvas/doc";
import { readTextSlot } from "@workspace/canvas/unstable";
import type { Dimensions } from "@workspace/geometry";

import { HitAreaRect } from "./BelowLabelHitAreaStyled";
import { calcBelowLabelTextRegion } from "../calcBelowLabelTextRegion";

/** The box the drawing fills, plus the slot the label is sized from. */
type BelowLabelHitAreaProps = {
	state: Dimensions & {
		/** The shape's text slots, keyed by slot id; an empty body slot draws no label. */
		text?: Record<string, TextSlot>;
	};
};

/**
 * Transparent grab area over the label a shape hangs below its box
 * (calcBelowLabelTextRegion). The label's own foreignObject is
 * `pointer-events: none`, so without this the label could neither be dragged nor
 * double-clicked into the editor; `data-part` names the slot such a double-click
 * opens (resolveTextSlotId). An empty label draws nothing, so it gets no area.
 *
 * Place it inside the shape's own `data-kind="object"` group — it is a part of
 * that object, not one of its own (the DOM contract allows a single
 * `data-kind` element per object).
 *
 * @param state The shape's box (width/height) and its text slots.
 * @returns The grab rect in local coordinates (shape center as origin), or null while the label is empty.
 */
export const BelowLabelHitArea: React.FC<BelowLabelHitAreaProps> = ({
	state,
}) => {
	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return null;
	}
	const label = calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
	return (
		<HitAreaRect
			data-part={BODY_TEXT_SLOT_ID}
			x={label.x}
			y={label.y}
			width={label.width}
			height={label.height}
		/>
	);
};
