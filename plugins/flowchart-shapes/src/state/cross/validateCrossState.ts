import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { CrossFeatures } from "../../schema/cross/CrossDoc";

/** Validates CrossState (Frame-family common logic generated from features). */
export const isValidCrossState: ObjectStateValidator =
	createFrameStateValidator(CrossFeatures);
