import { DisplayFeatures } from "./DisplayDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a DisplayDoc (Frame-family shared logic generated from features). */
export const validateDisplayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DisplayFeatures);
