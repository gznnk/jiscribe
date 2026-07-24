import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { ParallelogramFeatures } from "../../schema/parallelogram/ParallelogramDoc";

/** Validates ParallelogramState (Frame-family common logic generated from features). */
export const isValidParallelogramState: ObjectStateValidator =
	createFrameStateValidator(ParallelogramFeatures);
