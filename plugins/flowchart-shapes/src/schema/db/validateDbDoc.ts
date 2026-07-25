import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { DbFeatures } from "./DbDoc";

/** Validates a DbDoc (Frame-family shared logic generated from features). */
export const validateDbDoc: ObjectDocValidateFn =
	createFrameDocValidator(DbFeatures);
