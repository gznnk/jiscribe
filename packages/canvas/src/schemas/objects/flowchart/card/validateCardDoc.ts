import { CardFeatures } from "./CardDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a CardDoc (Frame-family shared logic generated from features). */
export const validateCardDoc: ObjectDocValidateFn =
	createFrameDocValidator(CardFeatures);
