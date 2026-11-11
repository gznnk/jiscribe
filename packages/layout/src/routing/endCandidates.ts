import {
	type BoundingBox,
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
import { GAP_LANE_SPACING } from "../shared/edgeSpacing";
import { createSideAxis } from "../shared/LayoutAxis";
import { LAYOUT_SIDES, toSideKey } from "../shared/layoutSides";
import { calcStraightAnchorRatio, columnAt } from "../shared/straightAnchor";
import type { LayoutEdgeAnchor, LayoutSide } from "../shared/types";

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
 * obstacle or a crossable band straight ahead nearer than that, so two facing stubs
 * meet halfway and a stub heading for a band stops short of it, where the route may
 * still bend.
 *
 * @param crossableBands - Stand in the stub's way as obstacles do, for every edge
 * @returns The length, or undefined when an obstacle or band sits on the stretch the
 *   stub must cross (between the box and the end of its caption) or right against it
 */
const calcStubLength = (
	node: RoutableNode,
	side: LayoutSide,
	anchor: Point,
	obstacles: readonly Obstacle[],
	excluded: ReadonlySet<Obstacle>,
	crossableBands: readonly BoundingBox[],
): number | undefined => {
	const box = convertRectToBoundingBox(node.bounds);
	const runsThroughLabel = side === "bottom" && node.labelBounds !== undefined;
	const clearFrom = runsThroughLabel
		? convertRectToBoundingBox(node.labelBounds as Rect).bottom - box.bottom
		: 0;
	let nearestGap = Infinity;
	const obstacleCount = obstacles.length;
	for (
		let index = 0;
		index < obstacleCount + crossableBands.length;
		index += 1
	) {
		let ahead: BoundingBox;
		if (index < obstacleCount) {
			const obstacle = obstacles[index];
			if (excluded.has(obstacle) || isOwnWall(obstacle, node, side)) {
				continue;
			}
			ahead = obstacle.box;
		} else {
			ahead = crossableBands[index - obstacleCount];
		}
		const { left, top, right, bottom } = ahead;
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
 *
 * @param crossableBands - What stops a stub besides the obstacles (see calcStubLength)
 * @param borders - Rects whose sides a spot beside the centre keeps a margin off
 * @param pinnedEnds - The only places the end may sit (see RoutableEdge.sourceEnds),
 *   which are then its candidates; undefined for an end free to sit on any side
 * @param otherPinnedEnds - The only places the other node's end may sit; a free end
 *   then runs straight to each of them lying on the side facing it, in place of the
 *   other node's centred end. Undefined when the other end is free
 */
export const listEndCandidates = (
	node: RoutableNode,
	other: RoutableNode,
	obstacles: readonly Obstacle[],
	excluded: ReadonlySet<Obstacle>,
	crossableBands: readonly BoundingBox[],
	borders: readonly BoundingBox[],
	pinnedEnds?: readonly LayoutEdgeAnchor[],
	otherPinnedEnds?: readonly LayoutEdgeAnchor[],
): EndCandidate[] => {
	const toCandidate = (
		side: LayoutSide,
		t: number,
		isPinned: boolean,
		isBeside = false,
	): EndCandidate | undefined => {
		const anchor = calcAnchorPoint(node.bounds, { side, t });
		const stubLength = calcStubLength(
			node,
			side,
			anchor,
			obstacles,
			excluded,
			crossableBands,
		);
		if (stubLength === undefined) {
			return undefined;
		}
		const outward = OUTWARD_DIRECTIONS[side];
		const tip = offsetPoint(anchor, outward, stubLength);
		// An end with no room for a stub on the grid would leave along its own side.
		if (
			snapToGridResolution(tip.x) === snapToGridResolution(anchor.x) &&
			snapToGridResolution(tip.y) === snapToGridResolution(anchor.y)
		) {
			return undefined;
		}
		return {
			side,
			t,
			anchor,
			tip,
			outward,
			sideCost:
				(side === "bottom" && node.labelBounds !== undefined
					? ROUTE_COSTS.labelledBottom
					: 0) + (isBeside ? 1 : 0),
			endKey: `${toSideKey(node.id, side)}\u0000${t}`,
			isPinned,
		};
	};
	if (pinnedEnds !== undefined) {
		return pinnedEnds.flatMap(({ side, t }) => {
			const candidate = toCandidate(side, t, true);
			return candidate === undefined ? [] : [candidate];
		});
	}
	const box = convertRectToBoundingBox(node.bounds);
	const otherBox = convertRectToBoundingBox(other.bounds);
	const isBeyond: Record<LayoutSide, boolean> = {
		top: otherBox.bottom <= box.top,
		right: otherBox.left >= box.right,
		bottom: otherBox.top >= box.bottom,
		left: otherBox.right <= box.left,
	};
	/**
	 * Whether a straight run at `column` from `side` to the other box keeps
	 * EDGE_ROUTE_MARGIN off every obstacle but the two boxes' own.
	 */
	const isClearBetween = (column: number, side: LayoutSide): boolean => {
		const isVertical = side === "top" || side === "bottom";
		const strip: BoundingBox = isVertical
			? {
					left: column - EDGE_ROUTE_MARGIN,
					right: column + EDGE_ROUTE_MARGIN,
					top: Math.min(box.bottom, otherBox.bottom),
					bottom: Math.max(box.top, otherBox.top),
				}
			: {
					top: column - EDGE_ROUTE_MARGIN,
					bottom: column + EDGE_ROUTE_MARGIN,
					left: Math.min(box.right, otherBox.right),
					right: Math.max(box.left, otherBox.left),
				};
		const isOffStrip = (rect: BoundingBox): boolean =>
			rect.right <= strip.left ||
			rect.left >= strip.right ||
			rect.bottom <= strip.top ||
			rect.top >= strip.bottom;
		return (
			obstacles.every(
				(obstacle) =>
					excluded.has(obstacle) ||
					obstacle.ownerId === node.id ||
					obstacle.ownerId === other.id ||
					isOffStrip(obstacle.box),
			) &&
			[...borders, ...crossableBands].every(
				(fence) =>
					isOffStrip(fence) ||
					(isVertical
						? [fence.left, fence.right]
						: [fence.top, fence.bottom]
					).every(
						(fenceSide) =>
							fenceSide <= column - EDGE_ROUTE_MARGIN ||
							fenceSide >= column + EDGE_ROUTE_MARGIN,
					),
			)
		);
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
		const besideRatios: number[] = [];
		if (isBeyond[side]) {
			const otherSide = OPPOSITE_SIDES[side];
			const axis = createSideAxis(side);
			const otherRatios =
				otherPinnedEnds === undefined
					? [
							calcCentredAnchorRatio(
								readAnchorRange(other.anchorBodyRanges, otherSide),
								readAnchorRange(other.anchorRanges, otherSide),
							),
						]
					: otherPinnedEnds
							.filter((end) => end.side === otherSide)
							.map(({ t }) => t);
			for (const otherRatio of otherRatios) {
				const straight = calcStraightAnchorRatio(
					node.bounds,
					columnAt(other.bounds, otherRatio, axis),
					usable,
					axis,
				);
				if (
					straight !== undefined &&
					ratios.every(
						(ratio) =>
							!isSameCoordinate(
								columnAt(node.bounds, straight, axis),
								columnAt(node.bounds, ratio, axis),
							),
					)
				) {
					ratios.push(straight);
				}
			}
		}
		if (isBeyond[side] && otherPinnedEnds === undefined) {
			const otherSide = OPPOSITE_SIDES[side];
			const axis = createSideAxis(side);
			const centres = [
				columnAt(node.bounds, ratios[0], axis),
				columnAt(
					other.bounds,
					calcCentredAnchorRatio(
						readAnchorRange(other.anchorBodyRanges, otherSide),
						readAnchorRange(other.anchorRanges, otherSide),
					),
					axis,
				),
			];
			for (const centre of centres) {
				for (const offset of [-GAP_LANE_SPACING, GAP_LANE_SPACING]) {
					const column = centre + offset;
					const beside = calcStraightAnchorRatio(
						node.bounds,
						column,
						usable,
						axis,
					);
					const otherBeside = calcStraightAnchorRatio(
						other.bounds,
						column,
						readAnchorRange(other.anchorRanges, otherSide),
						axis,
					);
					if (
						beside !== undefined &&
						otherBeside !== undefined &&
						isClearBetween(column, side) &&
						[...ratios, ...besideRatios].every(
							(ratio) =>
								!isSameCoordinate(
									columnAt(node.bounds, beside, axis),
									columnAt(node.bounds, ratio, axis),
								),
						)
					) {
						besideRatios.push(beside);
					}
				}
			}
		}
		for (const t of ratios) {
			const candidate = toCandidate(side, t, false);
			if (candidate !== undefined) {
				candidates.push(candidate);
			}
		}
		for (const t of besideRatios) {
			const candidate = toCandidate(side, t, false, true);
			if (candidate !== undefined) {
				candidates.push(candidate);
			}
		}
	}
	return candidates;
};
