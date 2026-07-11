import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { PARALLELOGRAM_SKEW_RATIO } from "../../../../schemas/objects/primitives/parallelogram/ParallelogramDoc";

/** Insets the region by half the skew on both sides to keep centered text inside the slanted silhouette. */
export const calcParallelogramTextRegion = ({
	width,
	height,
}: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			left: PARALLELOGRAM_SKEW_RATIO / 2,
			right: PARALLELOGRAM_SKEW_RATIO / 2,
		},
	);
