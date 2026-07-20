import { MultiDocumentFeatures } from "../../../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates MultiDocumentState (Frame-family common logic generated from features). */
export const isValidMultiDocumentState: ObjectStateValidator =
	createFrameStateValidator(MultiDocumentFeatures);
