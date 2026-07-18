import { StadiumElement } from "./StadiumStyled";
import type { StadiumState } from "../../../../states/objects/flowchart/stadium/StadiumState";
import { createFrameObject } from "../../base/createFrameObject";

/** Renders a Stadium (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Stadium = createFrameObject<StadiumState>((state, shape) => (
	<StadiumElement
		{...shape}
		x={-state.width / 2}
		y={-state.height / 2}
		width={state.width}
		height={state.height}
		rx={Math.min(state.width, state.height) / 2}
	/>
));
