import type { BoundingBox, Point } from "@jiscribe/geometry";

import type { Obstacle, PreparedEdge } from "./EdgeRouter";
import { growBox } from "./RouteGrid";
import { EDGE_ROUTE_MARGIN } from "../edgeRoutingCosts";

/**
 * The points of interest every route graph runs its lines from, and the lines they
 * and the borders lie on: each obstacle's corners, the corners of its margin band
 * and the midpoints of its sides; the middle of the gap between neighbouring
 * obstacles, so a gap narrower than two margins has a lane; every end candidate's
 * anchor and stub tip; and the corners of a frame two margins around all of them.
 * The borders add their sides, and the lines a margin either side of them, as lines
 * alone.
 */
export const collectOrigins = (
	obstacles: readonly Obstacle[],
	borders: readonly BoundingBox[],
	prepared: readonly PreparedEdge[],
): { origins: Point[]; xs: number[]; ys: number[] } => {
	const origins: Point[] = [];
	for (const { box } of obstacles) {
		const band = growBox(box, EDGE_ROUTE_MARGIN);
		const middleX = (box.left + box.right) / 2;
		const middleY = (box.top + box.bottom) / 2;
		for (const { left, top, right, bottom } of [box, band]) {
			origins.push(
				{ x: left, y: top },
				{ x: right, y: top },
				{ x: left, y: bottom },
				{ x: right, y: bottom },
			);
		}
		origins.push(
			{ x: middleX, y: box.top },
			{ x: middleX, y: box.bottom },
			{ x: box.left, y: middleY },
			{ x: box.right, y: middleY },
		);
	}
	for (const { box } of obstacles) {
		let nearestRight: BoundingBox | undefined;
		let nearestBelow: BoundingBox | undefined;
		for (const { box: other } of obstacles) {
			if (
				other.left >= box.right &&
				other.top < box.bottom &&
				box.top < other.bottom &&
				(nearestRight === undefined || other.left < nearestRight.left)
			) {
				nearestRight = other;
			}
			if (
				other.top >= box.bottom &&
				other.left < box.right &&
				box.left < other.right &&
				(nearestBelow === undefined || other.top < nearestBelow.top)
			) {
				nearestBelow = other;
			}
		}
		if (nearestRight !== undefined) {
			origins.push({
				x: (box.right + nearestRight.left) / 2,
				y:
					(Math.max(box.top, nearestRight.top) +
						Math.min(box.bottom, nearestRight.bottom)) /
					2,
			});
		}
		if (nearestBelow !== undefined) {
			origins.push({
				x:
					(Math.max(box.left, nearestBelow.left) +
						Math.min(box.right, nearestBelow.right)) /
					2,
				y: (box.bottom + nearestBelow.top) / 2,
			});
		}
	}
	for (const { sources, targets } of prepared) {
		for (const { anchor, tip } of [...sources, ...targets]) {
			origins.push(anchor, tip);
		}
	}
	const frame = growBox(
		{
			left: Math.min(...origins.map(({ x }) => x)),
			top: Math.min(...origins.map(({ y }) => y)),
			right: Math.max(...origins.map(({ x }) => x)),
			bottom: Math.max(...origins.map(({ y }) => y)),
		},
		EDGE_ROUTE_MARGIN * 2,
	);
	origins.push(
		{ x: frame.left, y: frame.top },
		{ x: frame.right, y: frame.top },
		{ x: frame.left, y: frame.bottom },
		{ x: frame.right, y: frame.bottom },
	);
	const xs = origins.map(({ x }) => x);
	const ys = origins.map(({ y }) => y);
	for (const border of borders) {
		for (const offset of [-EDGE_ROUTE_MARGIN, 0, EDGE_ROUTE_MARGIN]) {
			xs.push(border.left + offset, border.right + offset);
			ys.push(border.top + offset, border.bottom + offset);
		}
	}
	return {
		origins,
		xs: xs.filter((x) => x >= frame.left && x <= frame.right),
		ys: ys.filter((y) => y >= frame.top && y <= frame.bottom),
	};
};
