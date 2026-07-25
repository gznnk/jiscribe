import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { CardFeatures } from "./CardDoc";

/** Validates a CardDoc (Frame-family shared logic generated from features). */
export const validateCardDoc: ObjectDocValidateFn =
	createFrameDocValidator(CardFeatures);
