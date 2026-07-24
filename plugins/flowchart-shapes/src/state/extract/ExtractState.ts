import type { CreateObjectState } from "@workspace/canvas";

import type { ExtractFeatures } from "../../schema/extract/ExtractDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExtractStateBrand: unique symbol;

export type ExtractState = CreateObjectState<
	typeof ExtractFeatures,
	typeof ExtractStateBrand
>;
