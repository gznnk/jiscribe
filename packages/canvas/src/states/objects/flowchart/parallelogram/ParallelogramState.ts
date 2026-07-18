import type { ParallelogramFeatures } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ParallelogramStateBrand: unique symbol;

export type ParallelogramState = CreateObjectState<
	typeof ParallelogramFeatures,
	typeof ParallelogramStateBrand
>;
