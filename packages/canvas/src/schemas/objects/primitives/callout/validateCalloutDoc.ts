import { CalloutFeatures } from "./CalloutDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a CalloutDoc (Frame-family shared logic generated from features). */
export const validateCalloutDoc: ObjectDocValidateFn =
	createFrameDocValidator(CalloutFeatures);
