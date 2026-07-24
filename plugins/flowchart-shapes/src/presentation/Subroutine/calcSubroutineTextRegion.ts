import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { SUBROUTINE_BAR_RATIO } from "../../schema/subroutine/SubroutineDoc";

/** Insets by one bar width on each side so text sits between the two vertical bars. */
export const calcSubroutineTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: SUBROUTINE_BAR_RATIO, right: SUBROUTINE_BAR_RATIO },
	);
