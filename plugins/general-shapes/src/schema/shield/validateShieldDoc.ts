import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { ShieldFeatures } from "./ShieldDoc";

/** Validates a ShieldDoc (Frame-family shared logic generated from features). */
export const validateShieldDoc: ObjectDocValidateFn =
	createFrameDocValidator(ShieldFeatures);
