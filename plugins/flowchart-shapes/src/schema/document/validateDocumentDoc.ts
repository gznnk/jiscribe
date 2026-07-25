import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { DocumentFeatures } from "./DocumentDoc";

/** Validates a DocumentDoc (Frame-family shared logic generated from features). */
export const validateDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(DocumentFeatures);
