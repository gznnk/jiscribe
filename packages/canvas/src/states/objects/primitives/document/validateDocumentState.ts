import { DocumentFeatures } from "../../../../schemas/objects/primitives/document/DocumentDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DocumentState (Frame-family common logic generated from features). */
export const isValidDocumentState: ObjectStateValidateFn =
	createFrameStateValidator(DocumentFeatures);
