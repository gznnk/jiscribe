import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { resolveCalloutTail } from "./calloutTailGeometry";
import { CALLOUT_TAIL_RATIO } from "../../../../schemas/objects/annotations/callout/CalloutDoc";
import type { CalloutState } from "../../../../states/objects/annotations/callout/CalloutState";
import type { ObjectTextRegionCalculator } from "../../registry/ObjectTextRegionRegistry";

/** Restricts the region to the bubble body beside the tail band. */
export const calcCalloutTextRegion: ObjectTextRegionCalculator<
	Dimensions & Pick<CalloutState, "tail">
> = (state) => {
	const { width, height } = state;
	const { side } = resolveCalloutTail(state);
	return calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ [side]: CALLOUT_TAIL_RATIO },
	);
};
