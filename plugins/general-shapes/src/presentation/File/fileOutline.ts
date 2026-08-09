import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcFilePoints } from "./calcFilePoints";

/**
 * File outline (centered): the silhouette itself, so a connector's center anchor
 * lands on the folded corner's diagonal instead of on the bounding box.
 */
export const fileOutline = centeredPolygonOutline(calcFilePoints);
