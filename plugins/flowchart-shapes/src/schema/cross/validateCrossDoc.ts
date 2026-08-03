import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { CrossFeatures } from "./CrossDoc";

/** Validates a CrossDoc (Frame-family shared logic generated from features). */
export const validateCrossDoc: ObjectDocValidateFn =
	createFrameDocValidator(CrossFeatures);
