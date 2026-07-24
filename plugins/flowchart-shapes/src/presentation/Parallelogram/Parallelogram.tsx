import { createFrameObject } from "@workspace/canvas/unstable";

import { buildParallelogramPoints } from "./buildParallelogramPoints";
import { ParallelogramElement } from "./ParallelogramStyled";
import type { ParallelogramState } from "../../state/parallelogram/ParallelogramState";

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
