import type { ObjectStateValidator } from "@workspace/canvas";
import { createFrameStateValidator } from "@workspace/canvas/unstable";

import { QueueFeatures } from "../../schema/queue/QueueDoc";

/** Validates QueueState (Frame-family common logic generated from features). */
export const isValidQueueState: ObjectStateValidator =
	createFrameStateValidator(QueueFeatures);
