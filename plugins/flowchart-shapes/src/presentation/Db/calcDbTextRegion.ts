import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { DB_CAP_RATIO } from "../../schema/db/DbDoc";

/**
 * Restricts the region to the straight-sided cylinder body: below the full top
 * cap ellipse (2 * DB_CAP_RATIO) and above the bottom bulge (DB_CAP_RATIO), so
 * text never spills over the curved bottom at any aspect ratio.
 */
export const calcDbTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ top: DB_CAP_RATIO * 2, bottom: DB_CAP_RATIO },
	);
