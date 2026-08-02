import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { calcPackagePoints } from "./calcPackagePoints";

/**
 * Package outline (centered): the hexagonal silhouette, so a connector's center
 * anchor lands on a slanted face instead of on the bounding box, whose corners
 * the shape leaves entirely empty.
 */
export const packageOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcPackagePoints(-width / 2, -height / 2, width, height);
