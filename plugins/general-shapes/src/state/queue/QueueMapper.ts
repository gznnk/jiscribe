import { createFrameMapper } from "@workspace/canvas-sdk";

import type { QueueState } from "./QueueState";
import type { QueueDoc } from "../../schema/queue/QueueDoc";
import { QueueFeatures } from "../../schema/queue/QueueDoc";

/** QueueDoc <-> QueueState conversion (Frame-family shared logic generated from features). */
export const { toState: queueToState, toDoc: queueToDoc } = createFrameMapper<
	QueueDoc,
	QueueState
>(QueueFeatures);
