import type { CreateObjectState } from "@jiscribe/canvas";

import type { ParallelogramFeatures } from "../../schema/parallelogram/ParallelogramDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ParallelogramStateBrand: unique symbol;

export type ParallelogramState = CreateObjectState<
	typeof ParallelogramFeatures,
	typeof ParallelogramStateBrand
>;
