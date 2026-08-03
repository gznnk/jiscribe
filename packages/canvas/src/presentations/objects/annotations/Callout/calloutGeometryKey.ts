import { resolveCalloutTail } from "./calloutTailGeometry";
import type { CalloutState } from "../../../../states/objects/annotations/callout/CalloutState";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ObjectGeometryKeyCalculator } from "../../registry/ObjectGeometryKeyRegistry";

/**
 * The tail is the only state outside the frame that `calloutOutline` reads, and
 * it moves without touching the frame (the tail-tip drag), so it is keyed here.
 * Resolved through `resolveCalloutTail` so an absent field and an explicit
 * default share one key, as they share one outline.
 */
export const calloutGeometryKey: ObjectGeometryKeyCalculator<
	ObjectState & Pick<CalloutState, "tail">
> = (state) => {
	const tail = resolveCalloutTail(state);
	return `${tail.side}:${tail.position}`;
};
