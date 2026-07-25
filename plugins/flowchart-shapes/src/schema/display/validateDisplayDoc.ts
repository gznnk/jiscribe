import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { DisplayFeatures } from "./DisplayDoc";

/** Validates a DisplayDoc (Frame-family shared logic generated from features). */
export const validateDisplayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DisplayFeatures);
