import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { ParallelogramFeatures } from "./ParallelogramDoc";

/** Validates a ParallelogramDoc (Frame-family shared logic generated from features). */
export const validateParallelogramDoc: ObjectDocValidateFn =
	createFrameDocValidator(ParallelogramFeatures);
