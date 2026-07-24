import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { CrossFeatures } from "./CrossDoc";

/** Validates a CrossDoc (Frame-family shared logic generated from features). */
export const validateCrossDoc: ObjectDocValidateFn =
	createFrameDocValidator(CrossFeatures);
