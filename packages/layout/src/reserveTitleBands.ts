import type { Point, Rect } from "@jiscribe/geometry";

import { isSameCoordinate } from "./isSameCoordinate";
import type { LaidOutContainer } from "./types";

/**
 * Make room for every container's title band: everything below a container's top
 * edge, its own members first of all, moves down by the band's height, and the
 * containers spanning that edge grow by it. Top to bottom, so a container inside
 * another is moved by the outer band before it makes room for its own. A title sits
 * along the top edge whichever way the ranks run, so the move is always down the y
 * axis. Mutates the points and boxes in place.
 *
 * @param containers - The containers as laid out, each with its band's height (0 for none)
 * @param points - Every route point and label point of the drawing
 * @param boxes - Every node's and container's box
 */
export const reserveTitleBands = (
	containers: readonly (LaidOutContainer & { titleHeight: number })[],
	points: ReadonlySet<Point>,
	boxes: readonly Rect[],
): void => {
	for (const container of [...containers].sort(
		(a, b) => a.bounds.y - b.bounds.y,
	)) {
		if (container.titleHeight <= 0) {
			continue;
		}
		const edgeY = container.bounds.y;
		const isBelowEdge = (y: number): boolean =>
			y > edgeY && !isSameCoordinate(y, edgeY);
		for (const point of points) {
			if (isBelowEdge(point.y)) {
				point.y += container.titleHeight;
			}
		}
		for (const box of boxes) {
			const bottom = box.y + box.height;
			if (isBelowEdge(box.y)) {
				box.y += container.titleHeight;
			} else if (isBelowEdge(bottom)) {
				box.height += container.titleHeight;
			}
		}
	}
};
