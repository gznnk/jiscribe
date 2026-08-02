import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { calcFilePoints } from "./calcFilePoints";

/**
 * File outline (centered): the silhouette itself, so a connector's center anchor
 * lands on the folded corner's diagonal instead of on the bounding box.
 */
export const fileOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcFilePoints(-width / 2, -height / 2, width, height);
