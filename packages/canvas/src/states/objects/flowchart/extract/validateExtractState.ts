import { ExtractFeatures } from "../../../../schemas/objects/flowchart/extract/ExtractDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ExtractState (Frame-family common logic generated from features). */
export const isValidExtractState: ObjectStateValidateFn =
	createFrameStateValidator(ExtractFeatures);
