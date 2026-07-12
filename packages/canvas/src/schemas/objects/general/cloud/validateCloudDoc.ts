import { CloudFeatures } from "./CloudDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a CloudDoc (Frame-family shared logic generated from features). */
export const validateCloudDoc: ObjectDocValidateFn =
	createFrameDocValidator(CloudFeatures);
