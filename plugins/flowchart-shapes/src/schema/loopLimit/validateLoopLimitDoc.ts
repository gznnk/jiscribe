import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { LoopLimitFeatures } from "./LoopLimitDoc";

/** Validates a LoopLimitDoc (Frame-family shared logic generated from features). */
export const validateLoopLimitDoc: ObjectDocValidateFn =
	createFrameDocValidator(LoopLimitFeatures);
