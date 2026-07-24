import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { MultiDocumentFeatures } from "./MultiDocumentDoc";

/** Validates a MultiDocumentDoc (Frame-family shared logic generated from features). */
export const validateMultiDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(MultiDocumentFeatures);
