import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { ExtractFeatures } from "./ExtractDoc";

/** Validates a ExtractDoc (Frame-family shared logic generated from features). */
export const validateExtractDoc: ObjectDocValidateFn =
	createFrameDocValidator(ExtractFeatures);
