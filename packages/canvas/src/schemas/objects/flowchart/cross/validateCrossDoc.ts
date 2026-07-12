import { CrossFeatures } from "./CrossDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a CrossDoc (Frame-family shared logic generated from features). */
export const validateCrossDoc: ObjectDocValidateFn =
	createFrameDocValidator(CrossFeatures);
