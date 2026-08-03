import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { LoopLimitFeatures } from "./LoopLimitDoc";

/** Validates a LoopLimitDoc (Frame-family shared logic generated from features). */
export const validateLoopLimitDoc: ObjectDocValidateFn =
	createFrameDocValidator(LoopLimitFeatures);
