import {
	BelowLabelHitArea,
	createFrameObject,
} from "@workspace/canvas/unstable";

import { ActorHead, ActorLimbs } from "./ActorStyled";
import { buildActorFigure } from "./buildActorFigure";
import type { ActorState } from "../../state/actor/ActorState";
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
			{/* The label hangs outside the box, so the box-wide hit area misses it. */}
			<BelowLabelHitArea state={state} />
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
