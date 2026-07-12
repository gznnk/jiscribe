import { DocumentFeatures } from "./DocumentDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a DocumentDoc (Frame-family shared logic generated from features). */
export const validateDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(DocumentFeatures);
