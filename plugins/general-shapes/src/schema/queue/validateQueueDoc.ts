import type { ObjectDocValidateFn } from "@workspace/canvas-sdk/doc";
import { createFrameDocValidator } from "@workspace/canvas-sdk/doc";

import { QueueFeatures } from "./QueueDoc";

/** Validates a QueueDoc (Frame-family shared logic generated from features). */
export const validateQueueDoc: ObjectDocValidateFn =
	createFrameDocValidator(QueueFeatures);
