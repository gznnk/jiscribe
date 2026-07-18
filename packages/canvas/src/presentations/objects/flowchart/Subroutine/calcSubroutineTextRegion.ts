import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { SUBROUTINE_BAR_RATIO } from "../../../../schemas/objects/flowchart/subroutine/SubroutineDoc";
import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/** Insets by one bar width on each side so text sits between the two vertical bars. */
export const calcSubroutineTextRegion: TextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ left: SUBROUTINE_BAR_RATIO, right: SUBROUTINE_BAR_RATIO },
	);
