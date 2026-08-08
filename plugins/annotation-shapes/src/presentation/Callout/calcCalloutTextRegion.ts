import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { resolveCalloutTail } from "./calloutTailGeometry";
import { CALLOUT_TAIL_RATIO } from "../../schema/callout/CalloutDoc";
import type { CalloutState } from "../../state/callout/CalloutState";

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
