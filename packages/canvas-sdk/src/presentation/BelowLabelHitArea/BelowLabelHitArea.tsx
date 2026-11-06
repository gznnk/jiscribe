import { BODY_TEXT_SLOT_ID } from "@jiscribe/canvas";
import {
	readTextSlot,
	useObjectTextStyleDefaultsRegistry,
} from "@jiscribe/canvas/unstable";
import type { TextSlot } from "@jiscribe/doc";
import { calcLabelTextRegion } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { HitAreaRect } from "./BelowLabelHitAreaStyled";

/** The box the drawing fills, plus the slot the caption is sized from. */
type BelowLabelHitAreaProps = {
	state: Dimensions & {
		/** The shape's type, whose body defaults the caption is measured with. */
		type: string;
		/** The shape's text slots, keyed by slot id; an empty body slot draws no caption. */
		text?: Record<string, TextSlot>;
	};
};

/**
 * Transparent grab area over the caption a `features.text: "label"` shape hangs
 * below its box (calcLabelTextRegion), placed from the same input the core
 * places the caption's text and its background from: the box, the body slot,
 * and the type's own body defaults. The caption's own foreignObject is
 * `pointer-events: none`, so without this the caption could neither be dragged
 * nor double-clicked into the editor. It carries no `data-part`: a click on it
 * selects the shape rather than picking its slot, and a double-click opens the
 * shape's one body all the same. An empty caption draws nothing, so it gets no
 * area.
 *
 * For a type on the core's default placement alone, which declares no
 * `labelRegion`: a type placing its caption itself draws its grab area from its
 * own `labelRegion`.
 *
 * Place it inside the shape's own `data-kind="object"` group — it is a part of
 * that object, not one of its own (the DOM contract allows a single
 * `data-kind` element per object).
 *
 * @param state The shape's type, box (width/height) and text slots.
 * @returns The grab rect in local coordinates (shape center as origin), or null while the caption is empty.
 */
export const BelowLabelHitArea: React.FC<BelowLabelHitAreaProps> = ({
	state,
}) => {
	const typeDefaults = useObjectTextStyleDefaultsRegistry().get(
		state.type,
		BODY_TEXT_SLOT_ID,
	);
	if (readTextSlot(state.text, BODY_TEXT_SLOT_ID) === "") {
		return null;
	}
	const label = calcLabelTextRegion(
		state,
		state.text?.[BODY_TEXT_SLOT_ID],
		typeDefaults,
	);
	return (
		<HitAreaRect
			x={label.x}
			y={label.y}
			width={label.width}
			height={label.height}
		/>
	);
};
