import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { ExtractFeatures } from "./ExtractDoc";

/** Validates a ExtractDoc (Frame-family shared logic generated from features). */
export const validateExtractDoc: ObjectDocValidateFn =
	createFrameDocValidator(ExtractFeatures);
