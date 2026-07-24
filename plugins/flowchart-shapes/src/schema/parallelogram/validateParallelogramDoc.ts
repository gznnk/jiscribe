import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { ParallelogramFeatures } from "./ParallelogramDoc";

/** Validates a ParallelogramDoc (Frame-family shared logic generated from features). */
export const validateParallelogramDoc: ObjectDocValidateFn =
	createFrameDocValidator(ParallelogramFeatures);
