import {
	type BoundingBox,
	convertRectToBoundingBox,
	doRectsOverlap,
	type Point,
	type Rect,
} from "@jiscribe/geometry";

import { EDGE_ROUTE_MARGIN, ROUTE_COSTS } from "./edgeRoutingCosts";
import { calcAnchorPoint } from "../layered/calcOrthogonalPath";
import { EDGE_ANCHOR_FAN_RANGE } from "../layered/chooseEdgeAnchors";
import {
	calcCentredAnchorRatio,
	readAnchorRange,
	scaleIntoBodyWithinUsable,
} from "../shared/anchorRange";
import { ceilCoordinate } from "../shared/ceilCoordinate";
import { placeRouteLabels } from "./labels/placeRouteLabels";
import {
	type EndCandidate,
	EdgeRouter,
	type Obstacle,
	type PreparedEdge,
} from "./search/EdgeRouter";
import { floorCoordinate } from "../shared/floorCoordinate";
import { isSameCoordinate } from "../shared/isSameCoordinate";
import { type LayoutAxis, createLayoutAxis } from "../shared/LayoutAxis";
import {
	type RouteEnd,
	type RouteToNudge,
	nudgeRoutes,
} from "./nudge/nudgeRoutes";
import {
	type RouteDirection,
	STEP_X,
	STEP_Y,
	createRouteLines,
	growBox,
	snapToGridResolution,
	toGridLines,
} from "./search/RouteGrid";
import {
	calcSideRatio,
	calcStraightAnchorRatio,
	columnAt,
} from "../shared/straightAnchor";
import type {
	EdgeRoutingOptions,
	EdgeRoutingResult,
	LayoutEdgeAnchor,
	LayoutSide,
	RoutableEdge,
	RoutableNode,
	RoutedEdge,
} from "../shared/types";

const SIDES: readonly LayoutSide[] = ["top", "right", "bottom", "left"];

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

const ALONG_TOP_BOTTOM = createLayoutAxis("TB");
const ALONG_LEFT_RIGHT = createLayoutAxis("LR");
/** The axis whose across coordinate runs along `side`: x on top and bottom. */
const axisAlongSide = (side: LayoutSide): LayoutAxis =>
	side === "top" || side === "bottom" ? ALONG_TOP_BOTTOM : ALONG_LEFT_RIGHT;

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
		if (
			excluded.has(obstacle) ||
			(obstacle.ownerId === node.id && (!obstacle.isLabel || runsThroughLabel))
		) {
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
const listEndCandidates = (
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
	for (const side of SIDES) {
		const usable = readAnchorRange(node.anchorRanges, side);
		const ratios = [
			calcCentredAnchorRatio(
				readAnchorRange(node.anchorBodyRanges, side),
				usable,
			),
		];
		if (isBeyond[side]) {
			const otherSide = OPPOSITE_SIDES[side];
			const axis = axisAlongSide(side);
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
				endKey: `${node.id}\u0000${side}\u0000${t}`,
			});
		}
	}
	return candidates;
};

/**
 * What the nudging needs of an end at `point` on `node` (see RouteEnd): its slide is
 * the side's fan stretch (EDGE_ANCHOR_FAN_RANGE of the side's body within its usable
 * stretch, as a layered layout fans several ends over it) widened to hold `point`,
 * rounded inward to whole px and widened again to `point` itself where that cut it off.
 *
 * @param walls - The edge's walls, in the order the route lists them
 */
const toRouteEnd = (
	node: RoutableNode,
	{ side }: LayoutEdgeAnchor,
	point: Point,
	walls: readonly Obstacle[],
): RouteEnd => {
	const axis = axisAlongSide(side);
	const across = axis.across(point);
	const fan = scaleIntoBodyWithinUsable(
		readAnchorRange(node.anchorBodyRanges, side),
		readAnchorRange(node.anchorRanges, side),
		EDGE_ANCHOR_FAN_RANGE,
	);
	const ownWallIndices: number[] = [];
	walls.forEach(({ ownerId, isLabel }, index) => {
		if (ownerId === node.id && (!isLabel || side === "bottom")) {
			ownWallIndices.push(index);
		}
	});
	return {
		sideKey: `${node.id}\u0000${side}`,
		slide: {
			min: Math.min(
				ceilCoordinate(Math.min(columnAt(node.bounds, fan.min, axis), across)),
				across,
			),
			max: Math.max(
				floorCoordinate(Math.max(columnAt(node.bounds, fan.max, axis), across)),
				across,
			),
		},
		ownWallIndices,
	};
};

/**
 * `anchor` moved to where the nudging left its end, `point`; `anchor` itself when the
 * end did not move.
 *
 * @param original - Where the end stood before the nudging
 */
const toNudgedAnchor = (
	node: RoutableNode,
	anchor: LayoutEdgeAnchor,
	original: Point,
	point: Point,
): LayoutEdgeAnchor => {
	if (point.x === original.x && point.y === original.y) {
		return anchor;
	}
	const axis = axisAlongSide(anchor.side);
	return {
		side: anchor.side,
		t: calcSideRatio(node.bounds, axis.across(point), axis),
	};
};

/**
 * The obstacles an edge may run through: every one covering or overlapping either end
 * node's box, but for the end nodes' own boxes and captions.
 */
const listExcludedObstacles = (
	obstacles: readonly Obstacle[],
	source: RoutableNode,
	target: RoutableNode,
): Obstacle[] => {
	return obstacles.filter(
		(obstacle) =>
			obstacle.ownerId !== source.id &&
			obstacle.ownerId !== target.id &&
			(doRectsOverlap(obstacle.rect, source.bounds) ||
				doRectsOverlap(obstacle.rect, target.bounds)),
	);
};

/**
 * The points of interest every route graph runs its lines from, and the lines they
 * and the borders lie on: each obstacle's corners, the corners of its margin band
 * and the midpoints of its sides; the middle of the gap between neighbouring
 * obstacles, so a gap narrower than two margins has a lane; every end candidate's
 * anchor and stub tip; and the corners of a frame two margins around all of them.
 * The borders add their sides, and the lines a margin either side of them, as lines
 * alone.
 */
const collectOrigins = (
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

/**
 * Route edges between boxes that stay where they stand: each edge gets an end on a
 * side of each of its two boxes and a right-angled route between them that enters no
 * box but its own ends' — not even there, past the stub each end runs straight out
 * along — nor any caption or other obstacle, and runs flush along none of their edges.
 * Running within {@link EDGE_ROUTE_MARGIN} of them or of the borders' sides costs it,
 * the nearer the dearer, and it crosses and runs along the routes drawn before it as
 * little as it can. Edges are routed one by one in the order given, each against the
 * routes of the edges before it in this call only.
 *
 * Once every edge is routed, parallel runs are spread GAP_LANE_SPACING apart where
 * there is room, or less in a tight channel, in an order that keeps routes running
 * together from crossing where they need not (see nudgeRoutes). A route's first and
 * last segments slide along their box sides too, within the stretch a layered layout
 * fans a side's ends over (EDGE_ANCHOR_FAN_RANGE), so the ends sharing a side stand up
 * to EDGE_END_SPACING apart. Then a jog is taken out where one of the two segments
 * either side of it can move onto the other's line, the two merging into one (see
 * nudgeRoutes). An end that moves gets its `t` rewritten, and one that does not
 * keeps it exactly. Spreading and straightening may bring a run nearer a box, caption
 * or border than {@link EDGE_ROUTE_MARGIN} (see nudgeRoutes).
 *
 * Last, the label of each edge given one is placed on its finished route, the edges
 * taken in the order given, where its box covers as little of the nodes, their
 * captions and the obstacles as it can, then as few of the labels placed before it,
 * the other routes and the borders' outlines (see placeRouteLabels). Routing makes no
 * room for labels.
 *
 * Each end picks among, on every side of its box, the side's centre and the spot that
 * runs straight to the other box's centred end when the other box lies wholly beyond
 * the side. An end's stub runs {@link EDGE_ROUTE_MARGIN} out, a bottom one past the
 * box's caption first, and shrinks to half the gap to an obstacle straight ahead that
 * is nearer. A box, caption or obstacle covering or overlapping an edge's end box is
 * no obstacle to that edge.
 *
 * Routes run on an orthogonal visibility graph (see buildRouteGraph), searched first
 * close around the two end boxes and further out only when no route is found there
 * (see EdgeRouter), so an edge takes the cheapest route near its ends even where a
 * cheaper one runs further out.
 *
 * @param nodes - Every box an edge may end on or must go around, ids unique
 * @param edges - The edges to route, each between two different nodes; ends whose
 *   boxes overlap each other are routed but may well find no way. One given a `label`
 *   comes back with `labelPosition` and `labelOffset`
 * @param options - Title bands to keep out of, and frames to cross and run alongside sparingly
 * @returns The edges routed and the ids of those left without a route
 * @throws Error for a repeated node id, or an edge naming a node not among `nodes`
 */
export const routeEdgesAroundNodes = (
	nodes: readonly RoutableNode[],
	edges: readonly RoutableEdge[],
	options: EdgeRoutingOptions = {},
): EdgeRoutingResult => {
	const nodeById = new Map<string, RoutableNode>();
	for (const node of nodes) {
		if (nodeById.has(node.id)) {
			throw new Error(`node ${node.id} is given twice`);
		}
		nodeById.set(node.id, node);
	}
	const requireNode = (id: string, edgeId: string): RoutableNode => {
		const node = nodeById.get(id);
		if (node === undefined) {
			throw new Error(`edge ${edgeId} names node ${id}, which is not given`);
		}
		return node;
	};
	const obstacleRects = [
		...nodes.flatMap((node) => [
			{
				rect: node.bounds,
				ownerId: node.id,
				isLabel: false,
			},
			...(node.labelBounds === undefined
				? []
				: [
						{
							rect: node.labelBounds,
							ownerId: node.id,
							isLabel: true,
						},
					]),
		]),
		...(options.obstacles ?? []).map((rect) => ({ rect, isLabel: false })),
	];
	const obstacles: Obstacle[] = obstacleRects.map((obstacle, index) => ({
		...obstacle,
		index,
		box: convertRectToBoundingBox(obstacle.rect),
	}));
	const borders = (options.borders ?? []).map(convertRectToBoundingBox);

	const unroutedEdgeIds = new Set<string>();
	const prepared: PreparedEdge[] = [];
	for (const edge of edges) {
		const source = requireNode(edge.sourceId, edge.id);
		const target = requireNode(edge.targetId, edge.id);
		if (source === target) {
			unroutedEdgeIds.add(edge.id);
			continue;
		}
		const excluded = listExcludedObstacles(obstacles, source, target);
		const excludedSet = new Set(excluded);
		prepared.push({
			edge,
			sourceBox: convertRectToBoundingBox(source.bounds),
			targetBox: convertRectToBoundingBox(target.bounds),
			excluded,
			sources: listEndCandidates(source, target, obstacles, excludedSet),
			targets: listEndCandidates(target, source, obstacles, excludedSet),
		});
	}
	const routedById = new Map<string, RoutedEdge>();
	if (prepared.length > 0) {
		const { origins, xs, ys } = collectOrigins(obstacles, borders, prepared);
		const router = new EdgeRouter(
			createRouteLines(
				toGridLines(xs),
				toGridLines(ys),
				borders,
				EDGE_ROUTE_MARGIN,
			),
			obstacles,
			origins,
		);
		const toNudge: {
			edge: RoutableEdge;
			routed: RoutedEdge;
			route: RouteToNudge;
			sourcePoint: Point;
			targetPoint: Point;
		}[] = [];
		for (const edgeToRoute of prepared) {
			const routed = router.route(edgeToRoute);
			if (routed === undefined) {
				unroutedEdgeIds.add(edgeToRoute.edge.id);
				continue;
			}
			const { edge } = edgeToRoute;
			const excludedSet = new Set(edgeToRoute.excluded);
			const walls = obstacles.filter((obstacle) => !excludedSet.has(obstacle));
			const source = requireNode(edge.sourceId, edge.id);
			const target = requireNode(edge.targetId, edge.id);
			const sourcePoint = calcAnchorPoint(source.bounds, routed.source);
			const targetPoint = calcAnchorPoint(target.bounds, routed.target);
			toNudge.push({
				edge,
				routed,
				route: {
					path: [
						{ ...sourcePoint },
						...routed.points.map((point) => ({ ...point })),
						{ ...targetPoint },
					],
					walls: walls.map(({ box }) => box),
					source: toRouteEnd(source, routed.source, sourcePoint, walls),
					target: toRouteEnd(target, routed.target, targetPoint, walls),
				},
				sourcePoint,
				targetPoint,
			});
		}
		nudgeRoutes(
			toNudge.map(({ route }) => route),
			borders,
		);
		const placements = placeRouteLabels(
			toNudge.map(({ edge, route }) => ({
				path: route.path,
				label: edge.label,
			})),
			obstacleRects.map(({ rect }) => rect),
			options.borders ?? [],
		);
		toNudge.forEach(
			({ edge, routed, route, sourcePoint, targetPoint }, index) => {
				const { path } = route;
				const placement = placements[index];
				routedById.set(routed.id, {
					...routed,
					source: toNudgedAnchor(
						requireNode(edge.sourceId, edge.id),
						routed.source,
						sourcePoint,
						path[0],
					),
					target: toNudgedAnchor(
						requireNode(edge.targetId, edge.id),
						routed.target,
						targetPoint,
						path[path.length - 1],
					),
					points: path.slice(1, -1),
					...(placement === undefined
						? {}
						: {
								labelPosition: placement.position,
								labelOffset: placement.offset,
							}),
				});
			},
		);
	}
	return {
		edges: edges.flatMap(({ id }) => {
			const routed = routedById.get(id);
			return routed === undefined ? [] : [routed];
		}),
		unroutedEdgeIds: edges
			.filter(({ id }) => unroutedEdgeIds.has(id))
			.map(({ id }) => id),
	};
};
