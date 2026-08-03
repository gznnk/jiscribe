import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { CloudFeatures } from "./CloudDoc";

/** Validates a CloudDoc (Frame-family shared logic generated from features). */
export const validateCloudDoc: ObjectDocValidateFn =
	createFrameDocValidator(CloudFeatures);
