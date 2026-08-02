import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { LockFeatures } from "./LockDoc";

/** Validates a LockDoc (Frame-family shared logic generated from features). */
export const validateLockDoc: ObjectDocValidateFn =
	createFrameDocValidator(LockFeatures);
