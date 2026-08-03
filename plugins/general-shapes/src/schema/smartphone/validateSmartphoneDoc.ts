import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { SmartphoneFeatures } from "./SmartphoneDoc";

/** Validates a SmartphoneDoc (Frame-family shared logic generated from features). */
export const validateSmartphoneDoc: ObjectDocValidateFn =
	createFrameDocValidator(SmartphoneFeatures);
