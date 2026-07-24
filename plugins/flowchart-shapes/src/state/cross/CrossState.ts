import type { CreateObjectState } from "@workspace/canvas";

import type { CrossFeatures } from "../../schema/cross/CrossDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CrossStateBrand: unique symbol;

export type CrossState = CreateObjectState<
	typeof CrossFeatures,
	typeof CrossStateBrand
>;
