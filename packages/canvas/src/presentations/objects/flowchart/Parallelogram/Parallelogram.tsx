import { buildParallelogramPoints } from "./buildParallelogramPoints";
import { ParallelogramElement } from "./ParallelogramStyled";
import type { ParallelogramState } from "../../../../states/objects/flowchart/parallelogram/ParallelogramState";
import { createFrameObject } from "../../base/createFrameObject";

/** Parallelogram presentation (shared Frame logic lives in createFrameObject; only the shape is swapped in). */
export const Parallelogram = createFrameObject<ParallelogramState>(
	(state, shape) => (
		<ParallelogramElement
			{...shape}
			points={buildParallelogramPoints(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
		/>
	),
);
