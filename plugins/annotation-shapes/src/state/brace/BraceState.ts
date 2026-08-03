import type { CreateObjectState } from "@workspace/canvas";

import type {
	BraceDirection,
	BraceFeatures,
} from "../../schema/brace/BraceDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BraceStateBrand: unique symbol;

export type BraceState = CreateObjectState<
	typeof BraceFeatures,
	typeof BraceStateBrand,
	{
		/** Which way the tip points, away from the grouped shapes. Omitted = "left". */
		direction?: BraceDirection;
		/**
		 * Where the tip sits along the span, 0..1 from the top for a left/right
		 * brace and from the left for an up/down one. Omitted = 0.5.
		 */
		tipPosition?: number;
	}
>;
