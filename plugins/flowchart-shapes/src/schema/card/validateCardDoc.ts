import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { CardFeatures } from "./CardDoc";

/** Validates a CardDoc (Frame-family shared logic generated from features). */
export const validateCardDoc: ObjectDocValidateFn =
	createFrameDocValidator(CardFeatures);
