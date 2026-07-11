import type { CalloutFeatures } from "../../../../schemas/objects/primitives/callout/CalloutDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CalloutStateBrand: unique symbol;

export type CalloutState = CreateObjectState<
	typeof CalloutFeatures,
	typeof CalloutStateBrand
>;
