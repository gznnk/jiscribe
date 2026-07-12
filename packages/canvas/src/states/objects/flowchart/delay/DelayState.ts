import type { DelayFeatures } from "../../../../schemas/objects/flowchart/delay/DelayDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DelayStateBrand: unique symbol;

export type DelayState = CreateObjectState<
	typeof DelayFeatures,
	typeof DelayStateBrand
>;
