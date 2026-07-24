import { createFrameObject } from "@workspace/canvas/unstable";

import { buildCrossPoints } from "./buildCrossPoints";
import { CrossElement } from "./CrossStyled";
import type { CrossState } from "../../state/cross/CrossState";

/** Cross presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Cross = createFrameObject<CrossState>((state, shape) => (
	<CrossElement
		{...shape}
		points={buildCrossPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
