import type { CreateObjectState } from "@workspace/canvas";

import type { QueueFeatures } from "../../schema/queue/QueueDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const QueueStateBrand: unique symbol;

export type QueueState = CreateObjectState<
	typeof QueueFeatures,
	typeof QueueStateBrand
>;
