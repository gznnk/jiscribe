import type { ObjectOutlineCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";

import { calcFolderPoints } from "./calcFolderPoints";

/**
 * Folder outline (centered): the silhouette itself, so a connector's center
 * anchor lands on the tab's slanted edge instead of on the bounding box.
 */
export const folderOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => calcFolderPoints(-width / 2, -height / 2, width, height);
