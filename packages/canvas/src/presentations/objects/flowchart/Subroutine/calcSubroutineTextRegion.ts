import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { SUBROUTINE_BAR_RATIO } from "../../../../schemas/objects/flowchart/subroutine/SubroutineDoc";

/** Insets by one bar width on each side so text sits between the two vertical bars. */
export const calcSubroutineTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: SUBROUTINE_BAR_RATIO, right: SUBROUTINE_BAR_RATIO },
	);
