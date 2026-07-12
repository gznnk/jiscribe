import { DelayFeatures } from "../../../../schemas/objects/primitives/delay/DelayDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates DelayState (Frame-family common logic generated from features). */
export const isValidDelayState: ObjectStateValidateFn =
	createFrameStateValidator(DelayFeatures);
