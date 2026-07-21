import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import type { ObjectTextRegionCalculator } from "../../registry/ObjectTextRegionRegistry";

/**
 * Inset that lands the region's corners on the ellipse: the inscribed
 * axis-aligned rect is w/√2 × h/√2, so each side insets by (1 - 1/√2) / 2.
 */
const ELLIPSE_INSET = (1 - 1 / Math.SQRT2) / 2;

export const calcEllipseTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: ELLIPSE_INSET,
			right: ELLIPSE_INSET,
			bottom: ELLIPSE_INSET,
			left: ELLIPSE_INSET,
		},
	);
