import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { CALLOUT_TAIL_RATIO } from "../../../../schemas/objects/annotations/callout/CalloutDoc";

/** Restricts the region to the bubble body above the tail band. */
export const calcCalloutTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ bottom: CALLOUT_TAIL_RATIO },
	);
