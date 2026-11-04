import type { Point, Rect } from "@jiscribe/geometry";

import { isSameCoordinate } from "./isSameCoordinate";
import type { LayoutAxis } from "./LayoutAxis";
import type { RowIndex } from "./RowIndex";
import type { LayoutEdgeAnchor } from "./types";

/** Where an anchor sits on a box, in the same coordinates as `bounds`. */
export const calcAnchorPoint = (
	bounds: Rect,
	anchor: LayoutEdgeAnchor,
): Point => {
	switch (anchor.side) {
		case "top":
			return { x: bounds.x + bounds.width * anchor.t, y: bounds.y };
		case "bottom":
			return {
				x: bounds.x + bounds.width * anchor.t,
				y: bounds.y + bounds.height,
			};
		case "left":
			return { x: bounds.x, y: bounds.y + bounds.height * anchor.t };
		case "right":
			return {
				x: bounds.x + bounds.width,
				y: bounds.y + bounds.height * anchor.t,
			};
	}
};

/** Drop every point that lies on the straight line between its neighbours. */
const dropCollinearPoints = (path: readonly Point[]): Point[] =>
	path.filter((point, index) => {
		if (index === 0 || index === path.length - 1) {
			return true;
		}
		const previous = path[index - 1];
		const next = path[index + 1];
		const sameColumn =
			isSameCoordinate(previous.x, point.x) &&
			isSameCoordinate(point.x, next.x);
		const sameRow =
			isSameCoordinate(previous.y, point.y) &&
			isSameCoordinate(point.y, next.y);
		return !(sameColumn || sameRow);
	});

/**
 * Turn the polyline dagre routed into a right-angled one that stays clear of the
 * boxes. Dagre's interior points sit either in the middle of a gap between two rows
 * or in the slot a dummy node holds on a row, so the route changes column only in the
 * gaps, to the column of the next slot it passes, and crosses a row only in that slot,
 * where no box is.
 *
 * @param start - Where the edge leaves the source box
 * @param end - Where it enters the target box
 * @param dagrePoints - The route as dagre gives it, border to border, container
 *   borders already dropped (see dropBorderPoints)
 * @param rows - Tells a point on a row from one in a gap
 * @param axis - Decides which axis is the rank axis
 * @returns The whole route, `start` and `end` included, with no redundant point on it
 */
export const calcOrthogonalPath = (
	start: Point,
	end: Point,
	dagrePoints: readonly Point[],
	rows: RowIndex,
	axis: LayoutAxis,
): Point[] => {
	const interior = dagrePoints.slice(1, -1);
	// The slot each gap point hands the route on to: the next slot point after it,
	// found in one pass from the back.
	const nextSlotAfter: (Point | undefined)[] = new Array(interior.length);
	let upcomingSlot: Point | undefined;
	for (let index = interior.length - 1; index >= 0; index -= 1) {
		nextSlotAfter[index] = upcomingSlot;
		if (rows.isSlotRow(axis.along(interior[index]))) {
			upcomingSlot = interior[index];
		}
	}
	const path: Point[] = [start];
	let column = axis.across(start);
	interior.forEach((point, index) => {
		if (rows.isSlotRow(axis.along(point))) {
			return;
		}
		const nextSlot = nextSlotAfter[index];
		path.push(axis.make(column, axis.along(point)));
		column = nextSlot === undefined ? axis.across(end) : axis.across(nextSlot);
		path.push(axis.make(column, axis.along(point)));
	});
	path.push(end);
	return dropCollinearPoints(path);
};
