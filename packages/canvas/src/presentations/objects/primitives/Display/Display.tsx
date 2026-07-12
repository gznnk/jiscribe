import { buildDisplayPath } from "./buildDisplayPath";
import { DisplayElement } from "./DisplayStyled";
import type { DisplayState } from "../../../../states/objects/primitives/display/DisplayState";
import { createFrameObject } from "../../base/createFrameObject";

/** Display presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Display = createFrameObject<DisplayState>((state, shape) => (
	<DisplayElement
		{...shape}
		d={buildDisplayPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
