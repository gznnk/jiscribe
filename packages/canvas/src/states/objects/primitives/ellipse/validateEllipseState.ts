import { EllipseFeatures } from "../../../../schemas/objects/primitives/ellipse/EllipseDoc";
import type { ObjectStateValidateFn } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates EllipseState (Frame-family common logic generated from features). */
export const isValidEllipseState: ObjectStateValidateFn =
	createFrameStateValidator(EllipseFeatures);
