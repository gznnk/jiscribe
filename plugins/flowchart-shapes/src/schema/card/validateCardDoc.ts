import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { CardFeatures } from "./CardDoc";

/** Validates a CardDoc (Frame-family shared logic generated from features). */
export const validateCardDoc: ObjectDocValidateFn =
	createFrameDocValidator(CardFeatures);
