import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { DbFeatures } from "./DbDoc";

/** Validates a DbDoc (Frame-family shared logic generated from features). */
export const validateDbDoc: ObjectDocValidateFn =
	createFrameDocValidator(DbFeatures);
