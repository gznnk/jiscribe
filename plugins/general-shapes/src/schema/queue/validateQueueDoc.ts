import type { ObjectDocValidateFn } from "@workspace/canvas/unstable-doc";
import { createFrameDocValidator } from "@workspace/canvas/unstable-doc";

import { QueueFeatures } from "./QueueDoc";

/** Validates a QueueDoc (Frame-family shared logic generated from features). */
export const validateQueueDoc: ObjectDocValidateFn =
	createFrameDocValidator(QueueFeatures);
