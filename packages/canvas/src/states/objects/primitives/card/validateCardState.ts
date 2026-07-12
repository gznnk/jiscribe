import { CardFeatures } from "../../../../schemas/objects/primitives/card/CardDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CardState (Frame-family common logic generated from features). */
export const isValidCardState: ObjectStateValidateFn =
	createFrameStateValidator(CardFeatures);
