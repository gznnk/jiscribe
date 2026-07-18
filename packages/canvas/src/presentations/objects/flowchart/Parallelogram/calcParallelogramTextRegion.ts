import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { PARALLELOGRAM_SKEW_RATIO } from "../../../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/** Insets by a full skew on both sides so the region aligns with the slanted left/right edges. */
export const calcParallelogramTextRegion: TextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			left: PARALLELOGRAM_SKEW_RATIO,
			right: PARALLELOGRAM_SKEW_RATIO,
		},
	);
