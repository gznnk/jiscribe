import { buildTrapezoidPoints } from "./buildTrapezoidPoints";
import { TrapezoidElement } from "./TrapezoidStyled";
import type { TrapezoidState } from "../../../../states/objects/primitives/trapezoid/TrapezoidState";
import { createFrameObject } from "../../base/createFrameObject";

/** Trapezoid presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Trapezoid = createFrameObject<TrapezoidState>((state, shape) => (
	<TrapezoidElement
		{...shape}
		points={buildTrapezoidPoints(
			-state.width / 2,
			-state.height / 2,
			state.width,
			state.height,
		)}
	/>
));
