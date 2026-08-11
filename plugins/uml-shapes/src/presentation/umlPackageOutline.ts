import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcUmlPackagePoints } from "./calcUmlPackagePoints";

/**
 * Package outline (centered): the silhouette itself, tab included, so a
 * connector's center anchor stops on the notch beside the tab instead of on the
 * bounding box.
 *
 * Star-shaped about the center at every size — the tab is clamped to a quarter of
 * the height (calcUmlPackageTabHeight), so the center always sits below it and a
 * ray from there crosses the silhouette exactly once.
 */
export const umlPackageOutline = centeredPolygonOutline(calcUmlPackagePoints);
