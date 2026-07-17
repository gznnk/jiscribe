import type {
	CalloutFeatures,
	CalloutTail,
} from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CalloutStateBrand: unique symbol;

export type CalloutState = CreateObjectState<
	typeof CalloutFeatures,
	typeof CalloutStateBrand,
	{
		/** Tail placement. Omitted = CALLOUT_TAIL_DEFAULT (bottom, 0.2). */
		tail?: CalloutTail;
	}
>;
