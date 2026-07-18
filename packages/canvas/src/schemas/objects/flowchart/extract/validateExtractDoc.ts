import { ExtractFeatures } from "./ExtractDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a ExtractDoc (Frame-family shared logic generated from features). */
export const validateExtractDoc: ObjectDocValidateFn =
	createFrameDocValidator(ExtractFeatures);
