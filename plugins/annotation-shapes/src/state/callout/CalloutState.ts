import type { CreateObjectState } from "@jiscribe/canvas";

import type {
	CalloutFeatures,
	CalloutTail,
} from "../../schema/callout/CalloutDoc";

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
