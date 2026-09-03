import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";

import type { ObjectStateValidator } from "../../../registry/ObjectStateValidatorRegistry";
import { createFrameStateValidator } from "../../utils/createFrameStateValidator";

/** Validates RectState (Frame-family common logic generated from features). */
export const isValidRectState: ObjectStateValidator =
	createFrameStateValidator(RectFeatures);
