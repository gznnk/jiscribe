import type { Point, Rect } from "@jiscribe/geometry";

import { createLayoutAxis } from "./axis";
import { type LabelPlacement, calcLabelPosition } from "./calcLabelPosition";
import { calcAnchorPoint, calcOrthogonalPath } from "./calcOrthogonalPath";
import { chooseEdgeAnchors } from "./chooseEdgeAnchors";
import { isVerticalFlow } from "./LayoutDirection";
import { reserveTitleBands } from "./reserveTitleBands";
import { createRowIndex, dropBorderPoints } from "./rows";
import { runDagre } from "./runDagre";
import { spreadGapLanes } from "./spreadGapLanes";
import {
	LAYERED_LAYOUT_DEFAULTS,
	type LaidOutEdge,
	type LayeredLayoutOptions,
	type LayeredLayoutResult,
	type LayoutGraphContainer,
	type LayoutGraphEdge,
	type LayoutGraphNode,
} from "./types";

/**
 * Arrange a directed graph in layers (the Sugiyama scheme dagre implements): nodes are
 * ranked so edges point one way, ordered within each rank to reduce crossings, then
 * placed. The result is translated so the drawing's top-left is (0, 0); the caller
 * decides where it goes.
 *
 * The stages, in order: dagre places the boxes and routes each edge as a polyline
 * (runDagre); each edge's ends are chosen on the facing sides (chooseEdgeAnchors); the
 * polyline becomes a right-angled route (calcOrthogonalPath); routes crossing one gap
 * take lanes, and a gap too narrow for them is widened (spreadGapLanes); every
 * container's title band is kept clear (reserveTitleBands); each label is placed on
 * its route (calcLabelPosition).
 *
 * @param nodes - The boxes to place, each with the size it keeps; ids must be distinct
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
	const resolved = { ...LAYERED_LAYOUT_DEFAULTS, ...options };
	const axis = createLayoutAxis(resolved.direction);
	const vertical = isVerticalFlow(resolved.direction);

	const placed = runDagre(nodes, edges, resolved, containers);
	const rows = createRowIndex(placed.nodes, placed.containers, axis);
	const boundsById = new Map(
		placed.nodes.map(({ id, bounds }) => [id, bounds] as const),
	);
	const routes = placed.edges.map((dagreEdge) => ({
		edge: dagreEdge.edge,
		sourceBounds: boundsById.get(dagreEdge.edge.sourceId)!,
		targetBounds: boundsById.get(dagreEdge.edge.targetId)!,
		points: dropBorderPoints(dagreEdge.points, rows, axis),
		labelPoint: dagreEdge.labelPoint,
	}));

	const anchors = chooseEdgeAnchors(routes, rows, axis, vertical);
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
	spreadGapLanes(
		paths,
		resolved.direction,
		resolved.rankSpacing,
		routes.map(({ edge, labelPoint }) =>
			labelPoint !== undefined && edge.label !== undefined
				? {
						point: labelPoint,
						alongExtent: vertical ? edge.label.height : edge.label.width,
					}
				: undefined,
		),
		everyBox,
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
			titleHeight: titleHeightById.get(container.id) ?? 0,
		})),
		movablePoints,
		everyBox,
	);

	// A bundle decided where its labels go; any other label is placed from its route.
	const placeLabel = (
		path: readonly Point[],
		labelPoint: Point | undefined,
		label: LayoutGraphEdge["label"],
		bundlePosition: number | undefined,
		obstacles: readonly Rect[],
	): LabelPlacement | undefined => {
		if (labelPoint === undefined || label === undefined) {
			return undefined;
		}
		if (bundlePosition !== undefined) {
			return { position: bundlePosition, offset: 0 };
		}
		return calcLabelPosition(
			path,
			labelPoint,
			label,
			resolved.direction,
			resolved.rankSpacing,
			obstacles,
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
