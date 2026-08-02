import { BODY_TEXT_SLOT_ID } from "@workspace/canvas";
import { createFrameObject, readTextSlot } from "@workspace/canvas/unstable";

import { ActorHead, ActorLimbs } from "./ActorStyled";
import { buildActorFigure } from "./buildActorFigure";
import type { ActorState } from "../../state/actor/ActorState";
import { calcBelowLabelTextRegion } from "../shared/calcBelowLabelTextRegion";
import { PictogramHitArea } from "../shared/PictogramStyled";

/**
 * Renders an Actor stick figure (Frame-family shared logic lives in
 * createFrameObject; only the shape is swapped in). It does not go through the
 * shared Pictogram renderer the closed-silhouette shapes use: limbs this thin
 * would be hard to grab, so the whole bounding box is a hit area instead.
 */
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
			: calcBelowLabelTextRegion(state, BODY_TEXT_SLOT_ID);
	return (
		<g
			data-kind="object"
			data-id={state.id}
			transform={shape.transform}
			style={{ cursor: "grab" }}
		>
			<PictogramHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
			{label && (
				<PictogramHitArea
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
