import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import {
	DISPLAY_CAP_RATIO,
	DISPLAY_LEFT_RATIO,
} from "../../../../schemas/objects/flowchart/display/DisplayDoc";

/** Insets the pointed left and rounded right so text sits in the flat middle band. */
export const calcDisplayTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: DISPLAY_LEFT_RATIO, right: DISPLAY_CAP_RATIO },
	);
