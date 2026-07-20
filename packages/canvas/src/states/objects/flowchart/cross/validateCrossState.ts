import { CrossFeatures } from "../../../../schemas/objects/flowchart/cross/CrossDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CrossState (Frame-family common logic generated from features). */
export const isValidCrossState: ObjectStateValidator =
	createFrameStateValidator(CrossFeatures);
