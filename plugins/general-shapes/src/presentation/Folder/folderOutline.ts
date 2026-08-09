import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcFolderPoints } from "./calcFolderPoints";

/**
 * Folder outline (centered): the silhouette itself, so a connector's center
 * anchor lands on the tab's slanted edge instead of on the bounding box.
 *
 * Not star-shaped about the center once the box is wider than 3.5:1 — the tab
 * is anchored left, so past that ratio the foot of its slant swings angularly
 * behind the tab's top-right corner and a ray from the center crosses the
 * outline three times. The window is narrow (1.9° at 4:1, 0.53% of all
 * directions) and costs a connector line drawn across the tab, so it is left
 * as-is; closing it means moving FOLDER_TAB_WIDTH_RATIO or
 * FOLDER_TAB_SLOPE_RATIO, i.e. redrawing the folder.
 */
export const folderOutline = centeredPolygonOutline(calcFolderPoints);
