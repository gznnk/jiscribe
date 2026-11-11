import {
	convertRectToBoundingBox,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import { EDGE_ROUTE_MARGIN, ROUTE_COSTS } from "./edgeRoutingCosts";
import type { EndCandidate, Obstacle } from "./search/EdgeRouter";
import {
	type RouteDirection,
	STEP_X,
	STEP_Y,
	snapToGridResolution,
} from "./search/RouteGrid";
import type { RoutableNode } from "./types";
import { calcCentredAnchorRatio, readAnchorRange } from "../shared/anchorRange";
import { calcAnchorPoint } from "../shared/calcAnchorPoint";
import { isSameCoordinate } from "../shared/coordinate";
import { createSideAxis } from "../shared/LayoutAxis";
import { LAYOUT_SIDES, toSideKey } from "../shared/layoutSides";
import { calcStraightAnchorRatio, columnAt } from "../shared/straightAnchor";
import type { LayoutSide } from "../shared/types";

/** The direction an end on `side` leaves its box in. */
const OUTWARD_DIRECTIONS: Record<LayoutSide, RouteDirection> = {
	top: 0,
	right: 1,
	bottom: 2,
	left: 3,
};

const OPPOSITE_SIDES: Record<LayoutSide, LayoutSide> = {
	top: "bottom",
	right: "left",
	bottom: "top",
	left: "right",
};

/**
 * Whether `obstacle` is no wall to an end on `side` of `node`: the node's own box, and
 * its caption when the end sits on the bottom side and so runs straight through it.
 */
export const isOwnWall = (
	obstacle: Obstacle,
	node: RoutableNode,
	side: LayoutSide,
): boolean =>
	obstacle.ownerId === node.id && (!obstacle.isLabel || side === "bottom");

/**
 * How far the stub of an end at `anchor` on `side` runs: {@link EDGE_ROUTE_MARGIN}
 * past the box, or past its caption on a bottom side, but half the gap to an
 * obstacle straight ahead nearer than that, so two facing stubs meet halfway.
 *
 * @returns The length, or undefined when an obstacle sits on the stretch the stub
 *   must cross (between the box and the end of its caption) or right against it
 */
const calcStubLength = (
	node: RoutableNode,
	side: LayoutSide,
	anchor: Point,
	obstacles: readonly Obstacle[],
	excluded: ReadonlySet<Obstacle>,
): number | undefined => {
	const box = convertRectToBoundingBox(node.bounds);
	const runsThroughLabel = side === "bottom" && node.labelBounds !== undefined;
	const clearFrom = runsThroughLabel
		? convertRectToBoundingBox(node.labelBounds as Rect).bottom - box.bottom
		: 0;
	let nearestGap = Infinity;
	for (const obstacle of obstacles) {
		if (excluded.has(obstacle) || isOwnWall(obstacle, node, side)) {
			continue;
		}
		const { left, top, right, bottom } = obstacle.box;
		let near: number;
		let far: number;
		switch (side) {
			case "top":
				if (!(left < anchor.x && anchor.x < right)) {
					continue;
				}
				near = box.top - bottom;
				far = box.top - top;
				break;
			case "bottom":
				if (!(left < anchor.x && anchor.x < right)) {
					continue;
				}
				near = top - box.bottom;
				far = bottom - box.bottom;
				break;
			case "left":
				if (!(top < anchor.y && anchor.y < bottom)) {
					continue;
				}
				near = box.left - right;
				far = box.left - left;
				break;
			case "right":
				if (!(top < anchor.y && anchor.y < bottom)) {
					continue;
				}
				near = left - box.right;
				far = right - box.right;
				break;
		}
		if (far <= 0) {
			continue;
		}
		if (near < clearFrom || isSameCoordinate(near, clearFrom)) {
			return undefined;
		}
		nearestGap = Math.min(nearestGap, near - clearFrom);
	}
	return clearFrom + Math.min(EDGE_ROUTE_MARGIN, nearestGap / 2);
};

const offsetPoint = (
	point: Point,
	direction: RouteDirection,
	distance: number,
): Point => ({
	x: point.x + STEP_X[direction] * distance,
	y: point.y + STEP_Y[direction] * distance,
});

/**
 * The places one end of an edge may sit: on each side, the side's centre (as a side's
 * only end sits in a layered layout) and, when the other node lies wholly beyond the
 * side, the spot that runs straight to the other node's centred end (see
 * calcStraightAnchorRatio). A spot whose stub is blocked is left out.
 */
export const listEndCandidates = (
	node: RoutableNode,
	other: RoutableNode,
	obstacles: readonly Obstacle[],
	excluded: ReadonlySet<Obstacle>,
): EndCandidate[] => {
	const box = convertRectToBoundingBox(node.bounds);
	const otherBox = convertRectToBoundingBox(other.bounds);
	const isBeyond: Record<LayoutSide, boolean> = {
		top: otherBox.bottom <= box.top,
		right: otherBox.left >= box.right,
		bottom: otherBox.top >= box.bottom,
		left: otherBox.right <= box.left,
	};
	const candidates: EndCandidate[] = [];
	for (const side of LAYOUT_SIDES) {
		const usable = readAnchorRange(node.anchorRanges, side);
		const ratios = [
			calcCentredAnchorRatio(
				readAnchorRange(node.anchorBodyRanges, side),
				usable,
			),
		];
		if (isBeyond[side]) {
			const otherSide = OPPOSITE_SIDES[side];
			const axis = createSideAxis(side);
			const straight = calcStraightAnchorRatio(
				node.bounds,
				columnAt(
					other.bounds,
					calcCentredAnchorRatio(
						readAnchorRange(other.anchorBodyRanges, otherSide),
						readAnchorRange(other.anchorRanges, otherSide),
					),
					axis,
				),
				usable,
				axis,
			);
			if (
				straight !== undefined &&
				!isSameCoordinate(
					columnAt(node.bounds, straight, axis),
					columnAt(node.bounds, ratios[0], axis),
				)
			) {
				ratios.push(straight);
			}
		}
		for (const t of ratios) {
			const anchor = calcAnchorPoint(node.bounds, { side, t });
			const stubLength = calcStubLength(
				node,
				side,
				anchor,
				obstacles,
				excluded,
			);
			if (stubLength === undefined) {
				continue;
			}
			const outward = OUTWARD_DIRECTIONS[side];
			const tip = offsetPoint(anchor, outward, stubLength);
			// An end with no room for a stub on the grid would leave along its own side.
			if (
				snapToGridResolution(tip.x) === snapToGridResolution(anchor.x) &&
				snapToGridResolution(tip.y) === snapToGridResolution(anchor.y)
			) {
				continue;
			}
			candidates.push({
				side,
				t,
				anchor,
				tip,
				outward,
				sideCost:
					side === "bottom" && node.labelBounds !== undefined
						? ROUTE_COSTS.labelledBottom
						: 0,
				endKey: `${toSideKey(node.id, side)}\u0000${t}`,
			});
		}
	}
	return candidates;
};
