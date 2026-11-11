import {
	convertRectToBoundingBox,
	doRectsOverlap,
	type Point,
} from "@jiscribe/geometry";

import { EDGE_ROUTE_MARGIN } from "./edgeRoutingCosts";
import {
	isOwnWall,
	listContendedSideKeys,
	listEndCandidates,
} from "./endCandidates";
import { placeRouteLabels } from "./labels/placeRouteLabels";
import { nudgeRoutes } from "./nudge/nudgeRoutes";
import type { RouteEnd, RouteToNudge } from "./nudge/routeSegments";
import {
	EdgeRouter,
	type Obstacle,
	type PreparedEdge,
} from "./search/EdgeRouter";
import { createRouteLines, toGridLines } from "./search/RouteGrid";
import { collectOrigins } from "./search/routeOrigins";
import type {
	EdgeRoutingOptions,
	EdgeRoutingResult,
	RoutableEdge,
	RoutableNode,
	RoutedEdge,
} from "./types";
import {
	readAnchorRange,
	scaleIntoBodyWithinUsable,
} from "../shared/anchorRange";
import { calcAnchorPoint } from "../shared/calcAnchorPoint";
import { ceilCoordinate, floorCoordinate } from "../shared/coordinate";
import { EDGE_ANCHOR_FAN_RANGE } from "../shared/edgeSpacing";
import { createSideAxis } from "../shared/LayoutAxis";
import { toSideKey } from "../shared/layoutSides";
import { calcSideRatio, columnAt } from "../shared/straightAnchor";
import type { LayoutEdgeAnchor } from "../shared/types";

/**
 * What the nudging needs of an end at `point` on `node` (see RouteEnd): its slide is
 * the side's fan stretch (EDGE_ANCHOR_FAN_RANGE of the side's body within its usable
 * stretch, as a layered layout fans several ends over it) widened to hold `point`,
 * rounded inward to whole px and widened again to `point` itself where that cut it off.
 *
 * @param walls - The edge's walls, in the order the route lists them
 * @param isPinned - Whether the end is held to `point` (see RoutableEdge.sourceEnds),
 *   its slide then being that spot alone
 */
const toRouteEnd = (
	node: RoutableNode,
	{ side }: LayoutEdgeAnchor,
	point: Point,
	walls: readonly Obstacle[],
	isPinned: boolean,
): RouteEnd => {
	const axis = createSideAxis(side);
	const across = axis.across(point);
	const fan = scaleIntoBodyWithinUsable(
		readAnchorRange(node.anchorBodyRanges, side),
		readAnchorRange(node.anchorRanges, side),
		EDGE_ANCHOR_FAN_RANGE,
	);
	const ownWallIndices: number[] = [];
	walls.forEach((wall, index) => {
		if (isOwnWall(wall, node, side)) {
			ownWallIndices.push(index);
		}
	});
	if (isPinned) {
		return {
			sideKey: toSideKey(node.id, side),
			slide: { min: across, max: across },
			ownWallIndices,
			isPinned: true,
		};
	}
	return {
		sideKey: toSideKey(node.id, side),
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

/** Names the spot a pinned end is held to: the node's side and the place along it. */
const toPinnedEndKey = (
	node: RoutableNode,
	{ side, t }: LayoutEdgeAnchor,
): string => `${toSideKey(node.id, side)}\u0000${t}`;

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
	const axis = createSideAxis(anchor.side);
	return {
		side: anchor.side,
		t: calcSideRatio(node.bounds, axis.across(point), axis),
	};
};

/**
 * The obstacles an edge may run through: every hollow node's box but an end node's
 * own, and every other one covering or overlapping either end node's box, but for the
 * end nodes' own boxes and captions. What stands in a hollow end node is among them:
 * that node's own box already keeps its edges out.
 */
const listExcludedObstacles = (
	obstacles: readonly Obstacle[],
	source: RoutableNode,
	target: RoutableNode,
): Obstacle[] => {
	return obstacles.filter((obstacle) => {
		if (obstacle.ownerId === source.id || obstacle.ownerId === target.id) {
			return false;
		}
		return (
			obstacle.isHollow === true ||
			doRectsOverlap(obstacle.rect, source.bounds) ||
			doRectsOverlap(obstacle.rect, target.bounds)
		);
	});
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
 * the side; where neither end is given places to sit and two or more of the edges
 * have their other box wholly beyond that side of either box, also the spots
 * GAP_LANE_SPACING
 * either side of those two that run straight between the two boxes with
 * {@link EDGE_ROUTE_MARGIN} clear of every other obstacle, border's side and crossable
 * band alongside, which lose a tie to the others, so a second edge between two
 * facing boxes runs straight beside the first. An end's stub runs
 * {@link EDGE_ROUTE_MARGIN} out, a bottom one past the box's caption first, and
 * shrinks to half the gap to an obstacle or crossable band straight ahead that is
 * nearer. A box, caption or obstacle covering or overlapping an edge's end box is no
 * obstacle to that edge.
 *
 * A hollow node (`RoutableNode.isHollow`) is a frame: its box is an obstacle to the
 * edges ending on it alone, whose ends sit on its sides and leave outward, and every
 * other route runs through it; no label keeps off its box.
 *
 * A crossable band (`options.crossableBands`) is crossed straight over, top to bottom
 * or bottom to top: no route runs along it or bends in it, crossing its top and its
 * bottom side each costs what crossing a border's side does (once where a border's
 * side lies on one), a run alongside within the margin costs as one alongside a
 * border, no segment is nudged across its sides and no label is placed in it. It
 * holds for every edge, an end box it covers included, whose stubs it stops like any
 * other's.
 *
 * An end given places to sit (`sourceEnds` / `targetEnds`) takes the one of them that
 * gives the cheapest route and is pinned there: the nudging does not slide it, and
 * it takes no share of its side's stretch from the ends that do. The free end of
 * such an edge runs straight to each of those places on the side facing it, in place
 * of the other box's centred end. The routes drawn to one pinned place are a bundle:
 * a later route to that place runs along them for ROUTE_COSTS.bundledPerPx a px in
 * place of its length and their overlap, crossing for free what they already cross,
 * so the routes to one place gather into one trunk; their segments lying on one line
 * are then spread as one segment and no jog is taken out by moving one of them off
 * that line (see nudgeRoutes).
 *
 * Routes run on an orthogonal visibility graph (see buildRouteGraph), searched first
 * close around the two end boxes and further out only when no route is found there
 * (see EdgeRouter), so an edge takes the cheapest route near its ends even where a
 * cheaper one runs further out.
 *
 * @param nodes - Every box an edge may end on or must go around, ids unique
 * @param edges - The edges to route, each between two different nodes; ends whose
 *   boxes overlap each other are routed but may well find no way. One given a `label`
 *   comes back with `labelPosition` and `labelOffset`; one given `sourceEnds` or
 *   `targetEnds` comes back with that end on one of them, `side` and `t` as given, or
 *   unrouted when a stub can leave none of them
 * @param options - Rects to keep out of, bands to cross only straight over, and frames
 *   to cross and run alongside sparingly
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
				...(node.isHollow === true ? { isHollow: true as const } : {}),
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
	const crossableBands = (options.crossableBands ?? []).map(
		convertRectToBoundingBox,
	);
	// What gives the lines their coordinates besides the obstacles, and what no
	// segment is nudged across the sides of.
	const fences = [...borders, ...crossableBands];

	const contendedSideKeys = listContendedSideKeys(
		edges.flatMap((edge) => {
			const source = requireNode(edge.sourceId, edge.id);
			const target = requireNode(edge.targetId, edge.id);
			return source === target ? [] : [{ source, target }];
		}),
	);
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
			sourceNode: source,
			targetNode: target,
			sourceBox: convertRectToBoundingBox(source.bounds),
			targetBox: convertRectToBoundingBox(target.bounds),
			excluded,
			sources: listEndCandidates(
				source,
				target,
				obstacles,
				excludedSet,
				crossableBands,
				borders,
				contendedSideKeys,
				edge.sourceEnds,
				edge.targetEnds,
			),
			targets: listEndCandidates(
				target,
				source,
				obstacles,
				excludedSet,
				crossableBands,
				borders,
				contendedSideKeys,
				edge.targetEnds,
				edge.sourceEnds,
			),
		});
	}
	const routedById = new Map<string, RoutedEdge>();
	if (prepared.length > 0) {
		const { origins, xs, ys } = collectOrigins(
			obstacles,
			fences,
			prepared,
			crossableBands,
		);
		const router = new EdgeRouter(
			createRouteLines(
				toGridLines(xs),
				toGridLines(ys),
				borders,
				EDGE_ROUTE_MARGIN,
				crossableBands,
			),
			obstacles,
			origins,
			crossableBands,
		);
		const toNudge: {
			edge: RoutableEdge;
			sourceNode: RoutableNode;
			targetNode: RoutableNode;
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
			const { edge, sourceNode, targetNode } = edgeToRoute;
			const excludedSet = new Set(edgeToRoute.excluded);
			const walls = obstacles.filter((obstacle) => !excludedSet.has(obstacle));
			const sourcePoint = calcAnchorPoint(sourceNode.bounds, routed.source);
			const targetPoint = calcAnchorPoint(targetNode.bounds, routed.target);
			toNudge.push({
				edge,
				sourceNode,
				targetNode,
				routed,
				route: {
					path: [
						{ ...sourcePoint },
						...routed.points.map((point) => ({ ...point })),
						{ ...targetPoint },
					],
					walls: walls.map(({ box }) => box),
					source: toRouteEnd(
						sourceNode,
						routed.source,
						sourcePoint,
						walls,
						edge.sourceEnds !== undefined,
					),
					target: toRouteEnd(
						targetNode,
						routed.target,
						targetPoint,
						walls,
						edge.targetEnds !== undefined,
					),
					bundleKeys: [
						...(edge.sourceEnds !== undefined
							? [toPinnedEndKey(sourceNode, routed.source)]
							: []),
						...(edge.targetEnds !== undefined
							? [toPinnedEndKey(targetNode, routed.target)]
							: []),
					],
				},
				sourcePoint,
				targetPoint,
			});
		}
		nudgeRoutes(
			toNudge.map(({ route }) => route),
			fences,
		);
		const placements = placeRouteLabels(
			toNudge.map(({ edge, route }) => ({
				path: route.path,
				label: edge.label,
			})),
			[
				...obstacles
					.filter(({ isHollow }) => isHollow !== true)
					.map(({ rect }) => rect),
				...(options.crossableBands ?? []),
			],
			options.borders ?? [],
		);
		toNudge.forEach(
			(
				{ sourceNode, targetNode, routed, route, sourcePoint, targetPoint },
				index,
			) => {
				const { path } = route;
				const placement = placements[index];
				routedById.set(routed.id, {
					...routed,
					source: toNudgedAnchor(
						sourceNode,
						routed.source,
						sourcePoint,
						path[0],
					),
					target: toNudgedAnchor(
						targetNode,
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
