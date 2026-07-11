import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { PARALLELOGRAM_SKEW_RATIO } from "../../../../schemas/objects/primitives/parallelogram/ParallelogramDoc";

/** Insets by a full skew on both sides so the region aligns with the slanted left/right edges. */
export const calcParallelogramTextRegion = ({
	width,
	height,
}: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			left: PARALLELOGRAM_SKEW_RATIO,
			right: PARALLELOGRAM_SKEW_RATIO,
		},
	);
