import { CloudFeatures } from "../../../../schemas/objects/general/cloud/CloudDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CloudState (Frame-family common logic generated from features). */
export const isValidCloudState: ObjectStateValidator =
	createFrameStateValidator(CloudFeatures);
