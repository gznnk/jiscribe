import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { StoredDataFeatures } from "./StoredDataDoc";

/** Validates a StoredDataDoc (Frame-family shared logic generated from features). */
export const validateStoredDataDoc: ObjectDocValidateFn =
	createFrameDocValidator(StoredDataFeatures);
