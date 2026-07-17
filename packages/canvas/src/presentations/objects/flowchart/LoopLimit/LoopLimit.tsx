import { buildLoopLimitPoints } from "./buildLoopLimitPoints";
import { LoopLimitElement } from "./LoopLimitStyled";
import type { LoopLimitState } from "../../../../states/objects/flowchart/loopLimit/LoopLimitState";
import { createFrameObject } from "../../base/createFrameObject";

/** LoopLimit presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const LoopLimit = createFrameObject<LoopLimitState>((state, shape) => (
	<LoopLimitElement
		{...shape}
		points={buildLoopLimitPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
