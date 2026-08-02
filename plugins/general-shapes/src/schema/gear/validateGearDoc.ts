import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { GearFeatures } from "./GearDoc";

/** Validates a GearDoc (Frame-family shared logic generated from features). */
export const validateGearDoc: ObjectDocValidateFn =
	createFrameDocValidator(GearFeatures);
