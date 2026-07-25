import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { ManualInputFeatures } from "./ManualInputDoc";

/** Validates a ManualInputDoc (Frame-family shared logic generated from features). */
export const validateManualInputDoc: ObjectDocValidateFn =
	createFrameDocValidator(ManualInputFeatures);
