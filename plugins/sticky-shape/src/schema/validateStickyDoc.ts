import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { StickyFeatures } from "./StickyDoc";

/** Validates a StickyDoc (Frame-family shared logic generated from features). */
export const validateStickyDoc: ObjectDocValidateFn =
	createFrameDocValidator(StickyFeatures);
