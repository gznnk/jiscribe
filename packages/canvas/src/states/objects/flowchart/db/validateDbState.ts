import { DbFeatures } from "../../../../schemas/objects/flowchart/db/DbDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DbState (Frame-family common logic generated from features). */
export const isValidDbState: ObjectStateValidateFn =
	createFrameStateValidator(DbFeatures);
