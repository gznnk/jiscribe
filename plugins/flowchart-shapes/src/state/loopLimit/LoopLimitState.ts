import type { CreateObjectState } from "@workspace/canvas";

import type { LoopLimitFeatures } from "../../schema/loopLimit/LoopLimitDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LoopLimitStateBrand: unique symbol;

export type LoopLimitState = CreateObjectState<
	typeof LoopLimitFeatures,
	typeof LoopLimitStateBrand
>;
