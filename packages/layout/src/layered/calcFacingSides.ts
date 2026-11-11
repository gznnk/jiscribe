import type { Rect } from "@jiscribe/geometry";

import type { LayoutEdgeAnchor } from "../shared/types";

const centreOf = (bounds: Rect): { x: number; y: number } => ({
	x: bounds.x + bounds.width / 2,
	y: bounds.y + bounds.height / 2,
});

/**
 * The midpoints of the sides of two boxes that face each other, picked along the axis
 * where their centres lie further apart.
 *
 * @param source - The box the line leaves
 * @param target - The box the line enters, in the same coordinate space as `source`
 * @returns Anchors with `t` 0.5 on both boxes. A tie between the axes goes to the
 *   horizontal one, and boxes with the same centre face `right` to `left`
 */
export const calcFacingSides = (
	source: Rect,
	target: Rect,
): { source: LayoutEdgeAnchor; target: LayoutEdgeAnchor } => {
	const deltaX = centreOf(target).x - centreOf(source).x;
	const deltaY = centreOf(target).y - centreOf(source).y;
	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX >= 0
			? { source: { side: "right", t: 0.5 }, target: { side: "left", t: 0.5 } }
			: { source: { side: "left", t: 0.5 }, target: { side: "right", t: 0.5 } };
	}
	return deltaY >= 0
		? { source: { side: "bottom", t: 0.5 }, target: { side: "top", t: 0.5 } }
		: { source: { side: "top", t: 0.5 }, target: { side: "bottom", t: 0.5 } };
};
