import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { DocumentFeatures } from "./DocumentDoc";

/** Validates a DocumentDoc (Frame-family shared logic generated from features). */
export const validateDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(DocumentFeatures);
