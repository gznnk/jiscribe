import type { Point } from "@jiscribe/geometry";

import { calcNoteFoldSize } from "../../schema/note/calcNoteFoldSize";

/**
 * Corners of the note silhouette for a bounding box whose top-left corner is at
 * (x, y): the box with its top-right corner cut off by the fold. Shared by the
 * renderer and the outline, so the drawn shape and the one connectors attach to
 * cannot drift apart.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @returns Five corners, clockwise from the top-left.
 */
export const calcNotePoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const fold = calcNoteFoldSize(width, height);
	return [
		{ x, y },
		{ x: x + width - fold, y },
		{ x: x + width, y: y + fold },
		{ x: x + width, y: y + height },
		{ x, y: y + height },
	];
};
