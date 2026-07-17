import { MultiDocumentFeatures } from "./MultiDocumentDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a MultiDocumentDoc (Frame-family shared logic generated from features). */
export const validateMultiDocumentDoc: ObjectDocValidateFn =
	createFrameDocValidator(MultiDocumentFeatures);
