import { buildSubroutinePath } from "./buildSubroutinePath";
import { SubroutineElement } from "./SubroutineStyled";
import type { SubroutineState } from "../../../../states/objects/flowchart/subroutine/SubroutineState";
import { createFrameObject } from "../../base/createFrameObject";

/** Subroutine presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Subroutine = createFrameObject<SubroutineState>((state, shape) => (
	<SubroutineElement
		{...shape}
		d={buildSubroutinePath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
