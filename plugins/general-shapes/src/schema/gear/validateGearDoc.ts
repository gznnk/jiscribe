import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { GearFeatures } from "./GearDoc";

/** Validates a GearDoc (Frame-family shared logic generated from features). */
export const validateGearDoc: ObjectDocValidateFn =
	createFrameDocValidator(GearFeatures);
