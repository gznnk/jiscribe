import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { MultiDocumentFeatures } from "./MultiDocumentDoc";

/** Validates a MultiDocumentDoc (Frame-family shared logic generated from features). */
export const validateMultiDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(MultiDocumentFeatures);
