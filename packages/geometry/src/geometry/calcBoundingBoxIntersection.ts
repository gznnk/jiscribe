import type { BoundingBox } from "../types/BoundingBox";

/**
 * The part two axis-aligned boxes share.
 *
 * @param box - One of the boxes; the two are interchangeable, in one shared
 *   coordinate space
 * @param otherBox - The other box
 * @returns A new box (never one of the inputs), or null when the two share no
 *   area: apart, or only touching along an edge or at a corner. A `NaN` edge
 *   compares false and so also yields null
 */
export const calcBoundingBoxIntersection = (
	box: BoundingBox,
	otherBox: BoundingBox,
): BoundingBox | null => {
	const left = Math.max(box.left, otherBox.left);
	const top = Math.max(box.top, otherBox.top);
	const right = Math.min(box.right, otherBox.right);
	const bottom = Math.min(box.bottom, otherBox.bottom);
	// Written as "both extents positive" rather than its negation, so a NaN edge
	// falls on the null side.
	if (right > left && bottom > top) {
		return { left, top, right, bottom };
	}
	return null;
};
