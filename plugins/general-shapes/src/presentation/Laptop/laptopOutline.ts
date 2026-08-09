import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcLaptopPoints } from "./calcLaptopPoints";

/**
 * Laptop outline (centered): the union of screen and base (calcLaptopPoints).
 * Only the base reaches the full width of the box, so the bounding box would
 * claim a band down each side of the screen — 12% of the width apiece — plus two
 * entirely empty top corners.
 */
export const laptopOutline = centeredPolygonOutline(calcLaptopPoints);
