import { ShapeBodyPath, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildSubroutinePath } from "./buildSubroutinePath";
import type { SubroutineState } from "../../state/subroutine/SubroutineState";

/** Subroutine presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Subroutine = createFrameObject<SubroutineState>((state, shape) => (
	<ShapeBodyPath
		{...shape}
		d={buildSubroutinePath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
