import type { Point } from "@jiscribe/geometry";

import {
	FOLDER_TAB_HEIGHT_RATIO,
	FOLDER_TAB_SLOPE_RATIO,
	FOLDER_TAB_WIDTH_RATIO,
} from "../../schema/folder/FolderDoc";

/**
 * Corners of the folder silhouette for a bounding box whose top-left corner is
 * at (x, y): the body fills the box below the tab, and the tab sits on its
 * top-left with a slanted right edge. Shared by the renderer (centered origin)
 * and the outline, so the drawn shape and the one connectors attach to cannot
 * drift apart.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates; the tab starts here.
 * @param width Box width.
 * @param height Box height, tab included.
 * @returns Six corners, clockwise from the tab's top-left.
 */
export const calcFolderPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const tabHeight = height * FOLDER_TAB_HEIGHT_RATIO;
	const tabWidth = width * FOLDER_TAB_WIDTH_RATIO;
	// Off the shorter side, so the slant cannot run past the right edge of a tall
	// box (FOLDER_TAB_SLOPE_RATIO 参照). Bounded by 0.126 * width, which leaves it
	// clear of the tab's own left edge at 0.4 * width whatever the box.
	const tabSlantRun =
		Math.min(width, height) * FOLDER_TAB_HEIGHT_RATIO * FOLDER_TAB_SLOPE_RATIO;
	return [
		{ x, y },
		{ x: x + tabWidth, y },
		{ x: x + tabWidth + tabSlantRun, y: y + tabHeight },
		{ x: x + width, y: y + tabHeight },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
	];
};
