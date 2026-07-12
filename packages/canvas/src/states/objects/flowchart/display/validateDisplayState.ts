import { DisplayFeatures } from "../../../../schemas/objects/flowchart/display/DisplayDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DisplayState (Frame-family common logic generated from features). */
export const isValidDisplayState: ObjectStateValidateFn =
	createFrameStateValidator(DisplayFeatures);
