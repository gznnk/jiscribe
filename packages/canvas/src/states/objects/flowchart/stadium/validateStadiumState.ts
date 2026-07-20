import { StadiumFeatures } from "../../../../schemas/objects/flowchart/stadium/StadiumDoc";
import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates StadiumState (Frame-family common logic generated from features). */
export const isValidStadiumState: ObjectStateValidator =
	createFrameStateValidator(StadiumFeatures);
