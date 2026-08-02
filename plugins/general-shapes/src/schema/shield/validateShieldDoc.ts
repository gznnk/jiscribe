import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { ShieldFeatures } from "./ShieldDoc";

/** Validates a ShieldDoc (Frame-family shared logic generated from features). */
export const validateShieldDoc: ObjectDocValidateFn =
	createFrameDocValidator(ShieldFeatures);
