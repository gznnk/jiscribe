import { TrapezoidFeatures } from "../../../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates TrapezoidState (Frame-family common logic generated from features). */
export const isValidTrapezoidState: ObjectStateValidateFn =
	createFrameStateValidator(TrapezoidFeatures);
