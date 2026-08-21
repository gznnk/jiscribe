import { TextFeatures } from "./TextDoc";
import type { ObjectDocValidateFn } from "../../../../plugin/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a TextDoc (Frame-family shared logic generated from features; `point` checks x / y only). */
export const validateTextDoc: ObjectDocValidateFn =
	createFrameDocValidator(TextFeatures);
