import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { SmartphoneFeatures } from "./SmartphoneDoc";

/** Validates a SmartphoneDoc (Frame-family shared logic generated from features). */
export const validateSmartphoneDoc: ObjectDocValidateFn =
	createFrameDocValidator(SmartphoneFeatures);
