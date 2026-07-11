import { StadiumFeatures } from "../../../../schemas/objects/primitives/stadium/StadiumDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates StadiumState (Frame-family common logic generated from features). */
export const isValidStadiumState: ObjectStateValidateFn =
	createFrameStateValidator(StadiumFeatures);
