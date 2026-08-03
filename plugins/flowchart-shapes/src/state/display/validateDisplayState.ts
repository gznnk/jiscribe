import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { DisplayFeatures } from "../../schema/display/DisplayDoc";

/** Validates DisplayState (Frame-family common logic generated from features). */
export const isValidDisplayState: ObjectStateValidator =
	createFrameStateValidator(DisplayFeatures);
