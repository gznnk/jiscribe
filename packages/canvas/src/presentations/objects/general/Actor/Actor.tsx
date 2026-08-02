import { ActorHead, ActorHitArea, ActorLimbs } from "./ActorStyled";
import { buildActorFigure } from "./buildActorFigure";
import { calcActorTextRegion } from "./calcActorTextRegion";
import { BODY_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import type { ActorState } from "../../../../states/objects/general/actor/ActorState";
import { readTextSlot } from "../../../../states/objects/types/TextSlots";
import { createFrameObject } from "../../base/createFrameObject";

/** Renders an Actor stick figure (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Actor = createFrameObject<ActorState>((state, shape) => {
	const { headCx, headCy, headR, limbsPath } = buildActorFigure(
		-state.width / 2,
		-state.height / 2,
		state.width,
		state.height,
	);
	// The label hangs outside the box, so the box-wide hit area does not cover it.
	// data-part names the slot a double-click on the label opens (resolveTextSlotId).
	const label =
		readTextSlot(state.text, BODY_TEXT_SLOT_ID) === ""
			? null
			: calcActorTextRegion(state, BODY_TEXT_SLOT_ID);
	return (
		<g
			data-kind="object"
			data-id={state.id}
			transform={shape.transform}
			style={{ cursor: "grab" }}
		>
			<ActorHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			{label && (
				<ActorHitArea
					data-part={BODY_TEXT_SLOT_ID}
					x={label.x}
					y={label.y}
					width={label.width}
					height={label.height}
				/>
			)}
			<ActorHead
				cx={headCx}
				cy={headCy}
				r={headR}
				strokeColor={shape.strokeColor}
				fillColor={shape.fillColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
			<ActorLimbs
				d={limbsPath}
				strokeColor={shape.strokeColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		</g>
	);
});
