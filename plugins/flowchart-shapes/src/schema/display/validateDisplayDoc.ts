import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { DisplayFeatures } from "./DisplayDoc";

/** Validates a DisplayDoc (Frame-family shared logic generated from features). */
export const validateDisplayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DisplayFeatures);
