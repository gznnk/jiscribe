import type { Point, Rect } from "@jiscribe/geometry";

import {
	type LabelPlacement,
	type OwnMarginLengths,
	calcLabelPosition,
} from "./calcLabelPosition";
import { calcAnchorPoint, calcOrthogonalPath } from "./calcOrthogonalPath";
import { chooseEdgeAnchors } from "./chooseEdgeAnchors";
import { reserveTitleBands } from "./reserveTitleBands";
import { createRowIndex, dropBorderPoints } from "./RowIndex";
import { runDagre } from "./runDagre";
import { type GapLaneMarginBox, spreadGapLanes } from "./spreadGapLanes";
import { hasVisualMargin, readVisualMargin } from "./visualMargin";
import { createLayoutAxis } from "../shared/LayoutAxis";
import {
	LAYERED_LAYOUT_DEFAULTS,
	type LaidOutEdge,
	type LayeredLayoutOptions,
	type LayeredLayoutResult,
	type LayoutGraphContainer,
	type LayoutGraphEdge,
	type LayoutGraphNode,
} from "../shared/types";

/** Length of a right-angled route in px. */
const calcPathLength = (path: readonly Point[]): number =>
	path
		.slice(1)
		.reduce(
			(sum, end, index) =>
				sum + Math.abs(end.x - path[index].x) + Math.abs(end.y - path[index].y),
			0,
		);

/** Neither end of a route runs through a visual margin. */
const NO_OWN_MARGIN_LENGTHS: OwnMarginLengths = { start: 0, end: 0 };

/**
 * A position along a route measured on the route with its own-margin stretches cut
 * off (see OwnMarginLengths), as a position along the whole route; as given when
 * nothing is cut off or nothing would be left.
 */
const toPositionAlongWholePath = (
	position: number,
	path: readonly Point[],
	ownMarginLengths: OwnMarginLengths,
): number => {
	const { start, end } = ownMarginLengths;
	if (start === 0 && end === 0) {
		return position;
	}
	const pathLength = calcPathLength(path);
	if (start + end >= pathLength) {
		return position;
	}
	return (start + position * (pathLength - start - end)) / pathLength;
};

/**
 * Arrange a directed graph in layers (the Sugiyama scheme dagre implements): nodes are
 * ranked so edges point one way, ordered within each rank to reduce crossings, then
 * placed. The result is translated so the top-left of the boxes and containers is
 * (0, 0); the caller decides where it goes.
 *
 * The stages, in order: dagre places the boxes and routes each edge as a polyline
 * (runDagre); each edge's ends are chosen on the facing sides (chooseEdgeAnchors); the
 * polyline becomes a right-angled route (calcOrthogonalPath); routes crossing one gap
 * take lanes, and a gap too narrow for them is widened (spreadGapLanes); every
 * container's title band is kept clear (reserveTitleBands); each label is placed on
 * its route (calcLabelPosition).
 *
 * @param nodes - The boxes to place, each with the size it keeps; ids must be distinct.
 *   A node's `anchorRanges` keeps every edge end on it inside the stretch it gives,
 *   and its `anchorBodyRanges` is what the ends are centred and fanned out on. Its
 *   `visualMargin` is room kept around the box as part of the node, which an edge
 *   ending on the side it grows crosses straight and carries no label in (see
 *   {@link LayoutGraphNode.visualMargin})
 * @param edges - Directed edges between those ids. Several edges between the same pair are
 *   kept apart; an edge naming an id not in `nodes` is an error. An edge with a `label`
 *   gets room for it, in the gap it crosses or beside a rank it passes
 * @param options - Direction and gaps; see {@link LAYERED_LAYOUT_DEFAULTS}
 * @param containers - Containers nodes may sit inside (see {@link LayoutGraphContainer}); ids must be
 *   distinct from the nodes' and each other's, a parent must be another container, every
 *   container must hold a node or a container, and an edge ending on a container is an error. A
 *   container's `titleHeight` is kept clear below its top edge
 * @returns Every node's new top-left, every container's box, and, for every edge that is not
 *   a self loop, where it meets each box (on the facing sides, fanned out toward where it
 *   goes) and the corners of a route between them
 */
export const computeLayeredLayout = (
	nodes: readonly LayoutGraphNode[],
	edges: readonly LayoutGraphEdge[],
	options: LayeredLayoutOptions = {},
	containers: readonly LayoutGraphContainer[] = [],
): LayeredLayoutResult => {
	const resolvedOptions = { ...LAYERED_LAYOUT_DEFAULTS, ...options };
	const axis = createLayoutAxis(resolvedOptions.direction);

	const placed = runDagre(nodes, edges, resolvedOptions, containers);
	const rows = createRowIndex(placed.nodes, placed.containers, axis);
	const boundsById = new Map(
		placed.nodes.map(({ id, bounds }) => [id, bounds] as const),
	);
	const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
	const routes = placed.edges.map((dagreEdge) => ({
		edge: dagreEdge.edge,
		sourceBounds: boundsById.get(dagreEdge.edge.sourceId)!,
		targetBounds: boundsById.get(dagreEdge.edge.targetId)!,
		sourceAnchorRanges: nodeById.get(dagreEdge.edge.sourceId)?.anchorRanges,
		targetAnchorRanges: nodeById.get(dagreEdge.edge.targetId)?.anchorRanges,
		sourceAnchorBodyRanges: nodeById.get(dagreEdge.edge.sourceId)
			?.anchorBodyRanges,
		targetAnchorBodyRanges: nodeById.get(dagreEdge.edge.targetId)
			?.anchorBodyRanges,
		points: dropBorderPoints(dagreEdge.points, rows, axis),
		labelPoint: dagreEdge.labelPoint,
	}));

	const anchors = chooseEdgeAnchors(routes, rows, axis);
	const paths = routes.map((route, index) =>
		calcOrthogonalPath(
			calcAnchorPoint(route.sourceBounds, anchors[index].source),
			calcAnchorPoint(route.targetBounds, anchors[index].target),
			route.points,
			rows,
			axis,
		),
	);

	const everyBox = [...placed.nodes, ...placed.containers].map(
		({ bounds }) => bounds,
	);
	// Nothing below reads a margin unless some node has one.
	const hasAnyMargin = nodes.some(({ visualMargin }) =>
		hasVisualMargin(visualMargin),
	);
	const marginBoxes: GapLaneMarginBox[] = hasAnyMargin
		? placed.nodes.flatMap(({ id, bounds }) => {
				const margin = nodeById.get(id)?.visualMargin;
				return hasVisualMargin(margin) ? [{ box: bounds, margin }] : [];
			})
		: [];
	spreadGapLanes(
		paths,
		resolvedOptions.direction,
		resolvedOptions.rankSpacing,
		routes.map(({ edge, labelPoint }) =>
			labelPoint !== undefined && edge.label !== undefined
				? { point: labelPoint, alongExtent: axis.alongSize(edge.label) }
				: undefined,
		),
		everyBox,
		marginBoxes,
	);

	const titleHeightById = new Map(
		containers.map(
			(container) => [container.id, container.titleHeight ?? 0] as const,
		),
	);
	const movablePoints = new Set<Point>();
	for (const path of paths) {
		for (const point of path) {
			movablePoints.add(point);
		}
	}
	for (const { labelPoint } of routes) {
		if (labelPoint !== undefined) {
			movablePoints.add(labelPoint);
		}
	}
	reserveTitleBands(
		placed.containers.map((container) => ({
			...container,
			titleHeight: titleHeightById.get(container.id) as number,
		})),
		movablePoints,
		everyBox,
	);

	// A bundle decided where its labels go, on the route as if its own-margin
	// stretches were not there; any other label is placed from its route.
	const placeLabel = (
		path: readonly Point[],
		labelPoint: Point | undefined,
		label: LayoutGraphEdge["label"],
		bundlePosition: number | undefined,
		obstacles: readonly Rect[],
		ownMarginLengths: OwnMarginLengths,
	): LabelPlacement | undefined => {
		if (labelPoint === undefined || label === undefined) {
			return undefined;
		}
		if (bundlePosition !== undefined) {
			return {
				position: toPositionAlongWholePath(
					bundlePosition,
					path,
					ownMarginLengths,
				),
				offset: 0,
			};
		}
		return calcLabelPosition(
			path,
			labelPoint,
			label,
			resolvedOptions.direction,
			resolvedOptions.rankSpacing,
			obstacles,
			ownMarginLengths,
		);
	};
	const laidOutEdges: LaidOutEdge[] = routes.map((route, index) => {
		const path = paths[index];
		const anchor = anchors[index];
		const placement = placeLabel(
			path,
			route.labelPoint,
			route.edge.label,
			anchor.labelPosition,
			[route.sourceBounds, route.targetBounds],
			hasAnyMargin
				? {
						start: readVisualMargin(
							nodeById.get(route.edge.sourceId)?.visualMargin,
							anchor.source.side,
						),
						end: readVisualMargin(
							nodeById.get(route.edge.targetId)?.visualMargin,
							anchor.target.side,
						),
					}
				: NO_OWN_MARGIN_LENGTHS,
		);
		return {
			id: route.edge.id,
			source: anchor.source,
			target: anchor.target,
			points: path.slice(1, -1),
			...(placement !== undefined
				? { labelPosition: placement.position, labelOffset: placement.offset }
				: {}),
		};
	});

	return {
		nodes: placed.nodes,
		edges: laidOutEdges,
		containers: placed.containers,
	};
};
