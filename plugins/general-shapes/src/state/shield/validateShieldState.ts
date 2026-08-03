import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { ShieldFeatures } from "../../schema/shield/ShieldDoc";

/** Validates ShieldState (Frame-family common logic generated from features). */
export const isValidShieldState: ObjectStateValidator =
	createFrameStateValidator(ShieldFeatures);
