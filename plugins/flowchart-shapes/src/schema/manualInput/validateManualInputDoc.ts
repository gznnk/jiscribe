import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { ManualInputFeatures } from "./ManualInputDoc";

/** Validates a ManualInputDoc (Frame-family shared logic generated from features). */
export const validateManualInputDoc: ObjectDocValidateFn =
	createFrameDocValidator(ManualInputFeatures);
