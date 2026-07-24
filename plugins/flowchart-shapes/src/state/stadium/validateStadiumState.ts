import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { StadiumFeatures } from "../../schema/stadium/StadiumDoc";

/** Validates StadiumState (Frame-family common logic generated from features). */
export const isValidStadiumState: ObjectStateValidator =
	createFrameStateValidator(StadiumFeatures);
