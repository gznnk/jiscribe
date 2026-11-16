import type { CreateObjectState } from "@jiscribe/canvas";

import type { LightningFeatures } from "../../schema/lightning/LightningDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LightningStateBrand: unique symbol;

export type LightningState = CreateObjectState<
	typeof LightningFeatures,
	typeof LightningStateBrand
>;
