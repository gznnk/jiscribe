import type { CreateObjectState } from "@jiscribe/canvas";

import type { ExtractFeatures } from "../../schema/extract/ExtractDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ExtractStateBrand: unique symbol;

export type ExtractState = CreateObjectState<
	typeof ExtractFeatures,
	typeof ExtractStateBrand
>;
