import { buildDelayPath } from "./buildDelayPath";
import { DelayElement } from "./DelayStyled";
import type { DelayState } from "../../../../states/objects/flowchart/delay/DelayState";
import { createFrameObject } from "../../base/createFrameObject";

/** Delay presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Delay = createFrameObject<DelayState>((state, shape) => (
	<DelayElement
		{...shape}
		d={buildDelayPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
