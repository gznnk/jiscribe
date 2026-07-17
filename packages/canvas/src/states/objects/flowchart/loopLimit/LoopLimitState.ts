import type { LoopLimitFeatures } from "../../../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LoopLimitStateBrand: unique symbol;

export type LoopLimitState = CreateObjectState<
	typeof LoopLimitFeatures,
	typeof LoopLimitStateBrand
>;
