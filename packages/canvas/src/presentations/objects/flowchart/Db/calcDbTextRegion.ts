import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { DB_CAP_RATIO } from "../../../../schemas/objects/flowchart/db/DbDoc";

/** Restricts the region to the cylinder body below the cap ellipse (its lower edge sits at 2 * DB_CAP_RATIO). */
export const calcDbTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect({ cx: 0, cy: 0, width, height }, { top: DB_CAP_RATIO * 2 });
