import type { ObjectPartKindDefinition } from "@jiscribe/canvas";

import type { CalloutState } from "../state/callout/CalloutState";

/** The part-id namespace of the one thing a callout has inside it: its tail. */
export const CALLOUT_TAIL_PART_KIND = "tail";

/**
 * The only id in that namespace. A callout has exactly one tail, and the part
 * stands for the tip rather than the whole band: the tip is what the control
 * moves and what a connector attaches to.
 */
export const CALLOUT_TAIL_PART_ID = "tip";

/**
 * The callout's `tail` part definition. `has` never refuses the one id, the tail
 * being resolved from a default when the doc leaves it out (resolveCalloutTail),
 * so a selection on it can never go stale while the callout is alive.
 *
 * No `region`: the tip is a single point, so there is no box for the part
 * overlay to outline — the control's own handle is what shows it selected. No
 * `delete` either: a callout without a tail is a different shape, not a callout
 * missing a part.
 */
export const CALLOUT_TAIL_PART_DEFINITION: ObjectPartKindDefinition<CalloutState> =
	{
		kind: CALLOUT_TAIL_PART_KIND,
		has: (_object, partId) => partId === CALLOUT_TAIL_PART_ID,
	};
