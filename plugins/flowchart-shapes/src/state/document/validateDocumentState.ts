import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { DocumentFeatures } from "../../schema/document/DocumentDoc";

/** Validates DocumentState (Frame-family common logic generated from features). */
export const isValidDocumentState: ObjectStateValidator =
	createFrameStateValidator(DocumentFeatures);
