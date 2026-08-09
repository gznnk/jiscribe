import type { CreateObjectState } from "@jiscribe/canvas";

import type { DelayFeatures } from "../../schema/delay/DelayDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DelayStateBrand: unique symbol;

export type DelayState = CreateObjectState<
	typeof DelayFeatures,
	typeof DelayStateBrand
>;
