import { centeredPolygonOutline } from "@jiscribe/canvas-sdk/doc";

import { calcLightningPoints } from "./calcLightningPoints";

/**
 * Lightning outline (centered): the bolt itself. It touches each box edge at a
 * single point, so the bounding box would leave a connector stopping in mid-air
 * almost everywhere around it.
 */
export const lightningOutline = centeredPolygonOutline(calcLightningPoints);
