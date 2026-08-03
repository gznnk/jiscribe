import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { DelayFeatures } from "../../schema/delay/DelayDoc";

/** Validates DelayState (Frame-family common logic generated from features). */
export const isValidDelayState: ObjectStateValidator =
	createFrameStateValidator(DelayFeatures);
