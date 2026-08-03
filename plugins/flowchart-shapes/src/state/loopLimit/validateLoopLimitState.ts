import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { LoopLimitFeatures } from "../../schema/loopLimit/LoopLimitDoc";

/** Validates LoopLimitState (Frame-family common logic generated from features). */
export const isValidLoopLimitState: ObjectStateValidator =
	createFrameStateValidator(LoopLimitFeatures);
