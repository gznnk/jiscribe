import { CalloutFeatures } from "../../../../schemas/objects/primitives/callout/CalloutDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates CalloutState (Frame-family common logic generated from features). */
export const isValidCalloutState: ObjectStateValidateFn =
	createFrameStateValidator(CalloutFeatures);
