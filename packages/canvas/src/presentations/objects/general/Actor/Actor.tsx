import { ActorHead, ActorHitArea, ActorLimbs } from "./ActorStyled";
import { buildActorFigure } from "./buildActorFigure";
import type { ActorState } from "../../../../states/objects/general/actor/ActorState";
import { createFrameObject } from "../../base/createFrameObject";

/** Renders an Actor stick figure (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
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
			<ActorHitArea
				x={-state.width / 2}
				y={-state.height / 2}
				width={state.width}
				height={state.height}
			/>
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
