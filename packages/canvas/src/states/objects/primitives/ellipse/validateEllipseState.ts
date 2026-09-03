import { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates EllipseState (Frame-family common logic generated from features). */
export const isValidEllipseState: ObjectStateValidator =
	createFrameStateValidator(EllipseFeatures);
