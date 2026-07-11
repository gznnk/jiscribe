import { CloudFeatures } from "../../../../schemas/objects/primitives/cloud/CloudDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CloudState (Frame-family common logic generated from features). */
export const isValidCloudState: ObjectStateValidateFn =
	createFrameStateValidator(CloudFeatures);
