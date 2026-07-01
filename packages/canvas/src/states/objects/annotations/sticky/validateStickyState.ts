import { StickyFeatures } from "../../../../schemas/objects/annotations/sticky/StickyDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates a StickyState (Frame-family shared logic generated from features). */
export const isValidStickyState: ObjectStateValidateFn =
	createFrameStateValidator(StickyFeatures);
