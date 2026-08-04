import { ShapeBodyPath, createFrameObject } from "@workspace/canvas-sdk";

import { buildDelayPath } from "./buildDelayPath";
import type { DelayState } from "../../state/delay/DelayState";

/** Delay presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Delay = createFrameObject<DelayState>((state, shape) => (
	<ShapeBodyPath
		{...shape}
		d={buildDelayPath(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
