import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { DelayFeatures } from "./DelayDoc";

/** Validates a DelayDoc (Frame-family shared logic generated from features). */
export const validateDelayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DelayFeatures);
