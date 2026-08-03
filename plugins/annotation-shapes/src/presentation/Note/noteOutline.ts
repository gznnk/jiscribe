import { centeredPolygonOutline } from "@workspace/canvas/unstable";

import { calcNotePoints } from "./calcNotePoints";

/**
 * Note outline (centered): the silhouette itself, so a connector's center anchor
 * lands on the folded corner's diagonal instead of on the bounding box.
 */
export const noteOutline = centeredPolygonOutline(calcNotePoints);
