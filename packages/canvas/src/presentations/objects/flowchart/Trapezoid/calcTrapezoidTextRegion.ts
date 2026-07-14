import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { TRAPEZOID_SLOPE_RATIO } from "../../../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";

/** Insets each side by the full slope so the region matches the narrow bottom edge and text never crosses the slanted sides. */
export const calcTrapezoidTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: TRAPEZOID_SLOPE_RATIO, right: TRAPEZOID_SLOPE_RATIO },
	);
