import { DelayFeatures } from "./DelayDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a DelayDoc (Frame-family shared logic generated from features). */
export const validateDelayDoc: ObjectDocValidateFn =
	createFrameDocValidator(DelayFeatures);
