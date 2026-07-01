import { RectFeatures } from "../../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates RectState (Frame-family common logic generated from features). */
export const isValidRectState: ObjectStateValidateFn =
	createFrameStateValidator(RectFeatures);
