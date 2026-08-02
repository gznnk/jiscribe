import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { LockFeatures } from "../../schema/lock/LockDoc";

/** Validates LockState (Frame-family common logic generated from features). */
export const isValidLockState: ObjectStateValidator =
	createFrameStateValidator(LockFeatures);
