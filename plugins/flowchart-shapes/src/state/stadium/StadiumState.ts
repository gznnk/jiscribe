import type { CreateObjectState } from "@jiscribe/canvas";

import type { StadiumFeatures } from "../../schema/stadium/StadiumDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const StadiumStateBrand: unique symbol;

export type StadiumState = CreateObjectState<
	typeof StadiumFeatures,
	typeof StadiumStateBrand
>;
