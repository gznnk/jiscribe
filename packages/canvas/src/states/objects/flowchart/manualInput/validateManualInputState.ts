import { ManualInputFeatures } from "../../../../schemas/objects/flowchart/manualInput/ManualInputDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates ManualInputState (Frame-family common logic generated from features). */
export const isValidManualInputState: ObjectStateValidator =
	createFrameStateValidator(ManualInputFeatures);
