import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { CloudFeatures } from "../schema/CloudDoc";

/** Validates CloudState (Frame-family common logic generated from features). */
export const isValidCloudState: ObjectStateValidator =
	createFrameStateValidator(CloudFeatures);
