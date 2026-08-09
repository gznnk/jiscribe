import type { CreateObjectState } from "@jiscribe/canvas";

import type { CardFeatures } from "../../schema/card/CardDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CardStateBrand: unique symbol;

export type CardState = CreateObjectState<
	typeof CardFeatures,
	typeof CardStateBrand
>;
