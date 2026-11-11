import type { Point } from "@jiscribe/geometry";

import type { RowIndex } from "./RowIndex";
import type { LayoutAxis } from "../shared/LayoutAxis";
import { dropCollinearPoints } from "../shared/simplifyRoute";

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
