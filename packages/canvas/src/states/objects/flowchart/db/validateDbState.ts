import { DbFeatures } from "../../../../schemas/objects/flowchart/db/DbDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DbState (Frame-family common logic generated from features). */
export const isValidDbState: ObjectStateValidator =
	createFrameStateValidator(DbFeatures);
