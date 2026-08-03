import { ShapeBodyPolygon, createFrameObject } from "@workspace/canvas-sdk";

import { buildTrapezoidPoints } from "./buildTrapezoidPoints";
import type { TrapezoidState } from "../../state/trapezoid/TrapezoidState";

/** Trapezoid presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Trapezoid = createFrameObject<TrapezoidState>((state, shape) => (
	<ShapeBodyPolygon
		{...shape}
		points={buildTrapezoidPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
