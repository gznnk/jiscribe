import { createFrameMapper } from "@workspace/canvas/unstable";

import type { QueueState } from "./QueueState";
import type { QueueDoc } from "../../schema/queue/QueueDoc";
import { QueueFeatures } from "../../schema/queue/QueueDoc";

/** QueueDoc <-> QueueState conversion (Frame-family shared logic generated from features). */
export const { toState: queueToState, toDoc: queueToDoc } = createFrameMapper<
	QueueDoc,
	QueueState
>(QueueFeatures);
