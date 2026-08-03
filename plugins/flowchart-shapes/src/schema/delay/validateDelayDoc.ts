import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { DelayFeatures } from "./DelayDoc";

/** Validates a DelayDoc (Frame-family shared logic generated from features). */
export const validateDelayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DelayFeatures);
