import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { DocumentFeatures } from "./DocumentDoc";

/** Validates a DocumentDoc (Frame-family shared logic generated from features). */
export const validateDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(DocumentFeatures);
