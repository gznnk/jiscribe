import { ShapeBodyPolygon, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildLoopLimitPoints } from "./buildLoopLimitPoints";
import type { LoopLimitState } from "../../state/loopLimit/LoopLimitState";

/** LoopLimit presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const LoopLimit = createFrameObject<LoopLimitState>((state, shape) => (
	<ShapeBodyPolygon
		{...shape}
		points={buildLoopLimitPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
