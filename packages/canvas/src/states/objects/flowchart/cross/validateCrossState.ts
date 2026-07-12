import { CrossFeatures } from "../../../../schemas/objects/flowchart/cross/CrossDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CrossState (Frame-family common logic generated from features). */
export const isValidCrossState: ObjectStateValidateFn =
	createFrameStateValidator(CrossFeatures);
