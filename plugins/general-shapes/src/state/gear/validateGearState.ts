import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { GearFeatures } from "../../schema/gear/GearDoc";

/** Validates GearState (Frame-family common logic generated from features). */
export const isValidGearState: ObjectStateValidator =
	createFrameStateValidator(GearFeatures);
