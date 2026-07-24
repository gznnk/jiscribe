import type { ObjectDocValidateFn } from "@workspace/canvas/unstable";
import { createFrameDocValidator } from "@workspace/canvas/unstable";

import { StoredDataFeatures } from "./StoredDataDoc";

/** Validates a StoredDataDoc (Frame-family shared logic generated from features). */
export const validateStoredDataDoc: ObjectDocValidateFn =
	createFrameDocValidator(StoredDataFeatures);
