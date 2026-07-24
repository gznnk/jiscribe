import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { PARALLELOGRAM_SKEW_RATIO } from "../../schema/parallelogram/ParallelogramDoc";

/** Insets by a full skew on both sides so the region aligns with the slanted left/right edges. */
export const calcParallelogramTextRegion: ObjectTextRegionCalculator<
	Dimensions
> = ({ width, height }) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			left: PARALLELOGRAM_SKEW_RATIO,
			right: PARALLELOGRAM_SKEW_RATIO,
		},
	);
