import { SubroutineFeatures } from "../../../../schemas/objects/flowchart/subroutine/SubroutineDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates SubroutineState (Frame-family common logic generated from features). */
export const isValidSubroutineState: ObjectStateValidateFn =
	createFrameStateValidator(SubroutineFeatures);
