import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas-sdk";

import { ManualInputFeatures } from "../../schema/manualInput/ManualInputDoc";

/** Validates ManualInputState (Frame-family common logic generated from features). */
export const isValidManualInputState: ObjectStateValidator =
	createFrameStateValidator(ManualInputFeatures);
