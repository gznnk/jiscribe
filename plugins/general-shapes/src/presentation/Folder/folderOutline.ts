import { centeredPolygonOutline } from "@workspace/canvas/unstable";

import { calcFolderPoints } from "./calcFolderPoints";

/**
 * Folder outline (centered): the silhouette itself, so a connector's center
 * anchor lands on the tab's slanted edge instead of on the bounding box.
 */
export const folderOutline = centeredPolygonOutline(calcFolderPoints);
