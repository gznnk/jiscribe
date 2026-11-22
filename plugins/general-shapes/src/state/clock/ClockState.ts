import type { CreateObjectState } from "@jiscribe/canvas";

import type { ClockFeatures } from "../../schema/clock/ClockDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ClockStateBrand: unique symbol;

export type ClockState = CreateObjectState<
	typeof ClockFeatures,
	typeof ClockStateBrand
>;
