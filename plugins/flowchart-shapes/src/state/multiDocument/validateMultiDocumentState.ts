import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { MultiDocumentFeatures } from "../../schema/multiDocument/MultiDocumentDoc";

/** Validates MultiDocumentState (Frame-family common logic generated from features). */
export const isValidMultiDocumentState: ObjectStateValidator =
	createFrameStateValidator(MultiDocumentFeatures);
