import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { MultiDocumentFeatures } from "./MultiDocumentDoc";

/** Validates a MultiDocumentDoc (Frame-family shared logic generated from features). */
export const validateMultiDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(MultiDocumentFeatures);
