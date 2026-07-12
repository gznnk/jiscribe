import { ManualInputFeatures } from "../../../../schemas/objects/flowchart/manualInput/ManualInputDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ManualInputState (Frame-family common logic generated from features). */
export const isValidManualInputState: ObjectStateValidateFn =
	createFrameStateValidator(ManualInputFeatures);
