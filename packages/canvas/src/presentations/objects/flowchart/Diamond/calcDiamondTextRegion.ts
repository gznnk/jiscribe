import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import type { TextRegionCalculator } from "../../registry/TextRegionRegistry";

/**
 * Inset that lands the region's corners on the diamond edges: a centered rect
 * of half the width and half the height (its corners satisfy x/a + y/b = 1).
 */
const DIAMOND_INSET = 0.25;

export const calcDiamondTextRegion: TextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: DIAMOND_INSET,
			right: DIAMOND_INSET,
			bottom: DIAMOND_INSET,
			left: DIAMOND_INSET,
		},
	);
