import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcPackagePoints } from "./calcPackagePoints";

/**
 * Package outline (centered): the hexagonal silhouette, so a connector's center
 * anchor lands on a slanted face instead of on the bounding box, whose corners
 * the shape leaves entirely empty.
 */
export const packageOutline = centeredPolygonOutline(calcPackagePoints);
