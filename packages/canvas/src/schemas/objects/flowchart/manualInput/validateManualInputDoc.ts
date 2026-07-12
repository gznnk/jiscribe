import { ManualInputFeatures } from "./ManualInputDoc";
import type { ObjectDocValidateFn } from "../../../registry/ObjectDocValidatorRegistry";
import { createFrameDocValidator } from "../../utils/createFrameDocValidator";

/** Validates a ManualInputDoc (Frame-family shared logic generated from features). */
export const validateManualInputDoc: ObjectDocValidateFn =
	createFrameDocValidator(ManualInputFeatures);
