// dagre ships one declaration file, typed as ESM. Under the Node16 resolution the VSCode
// extension typechecks with, this file counts as CommonJS and the static import is
// reported (TS1479) although the exports map serves a require build; every other
// consumer resolves in bundler mode and sees no error, so the directive is ts-ignore
// (ts-expect-error would then be the unused one).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Graph, layout } from "@dagrejs/dagre";
import type { Point, Rect } from "@jiscribe/geometry";

import { calcPositionAlongPath } from "./calcPositionAlongPath";
import { type LayoutDirection, isVerticalFlow } from "./LayoutDirection";
import { spreadGapLanes } from "./spreadGapLanes";

export { LayoutDirections, type LayoutDirection } from "./LayoutDirection";

/** Side of a node's box an edge leaves from or arrives at, in the node's own frame. */
export type LayoutSide = "top" | "right" | "bottom" | "left";

export type LayoutGraphNode = {
	id: string;
	/** Width of the box the node occupies, in px; the layout never resizes it. */
	width: number;
	/** Height of the box, in px. */
	height: number;
};

export type LayoutGraphEdge = {
	id: string;
	/** Id of the node the edge starts at; must be among the nodes. */
	sourceId: string;
	/** Id of the node the edge ends at; must be among the nodes. */
	targetId: string;
	/** Size of the label box drawn on the edge, in px; the layout keeps that much room free for it. */
	label?: { width: number; height: number };
};

export type LayeredLayoutOptions = {
	/** Defaults to `TB`. */
	direction?: LayoutDirection;
	/** Gap in px between neighbouring nodes of one rank; defaults to {@link LAYERED_LAYOUT_DEFAULTS}. */
	nodeSpacing?: number;
	/** Gap in px between one rank and the next; defaults to {@link LAYERED_LAYOUT_DEFAULTS}. */
	rankSpacing?: number;
};

export const LAYERED_LAYOUT_DEFAULTS: Required<LayeredLayoutOptions> = {
	direction: "TB",
	nodeSpacing: 80,
	rankSpacing: 80,
};

export type LaidOutNode = {
	id: string;
	/** Top-left of the node's box; the whole drawing starts at (0, 0). */
	bounds: Rect;
};

/** Where an edge meets a box: a side and a position along it. */
export type LayoutEdgeAnchor = {
	side: LayoutSide;
	/**
	 * Position along the side, 0..1 measured left to right on `top` / `bottom` and top to
	 * bottom on `left` / `right`; 0.5 is the side's midpoint. Within
	 * {@link EDGE_ANCHOR_STRAIGHT_RANGE} when that lets the edge leave in a straight line,
	 * otherwise 0.5 for the only edge on its side and within {@link EDGE_ANCHOR_FAN_RANGE}
	 * for one of several (see calcEndAnchor).
	 */
	t: number;
};

/**
 * How far along a side an anchor may sit when it puts the edge straight on the column
 * it travels in, so a short jog in the gap is traded for a line near the corner.
 */
export const EDGE_ANCHOR_STRAIGHT_RANGE = { min: 0.05, max: 0.95 } as const;

/** How far along a side the anchors of several edges sharing it may spread. */
export const EDGE_ANCHOR_FAN_RANGE = { min: 0.2, max: 0.8 } as const;

export type LaidOutEdge = {
	id: string;
	/** Where the edge leaves the source box, on the side facing the target along the rank axis. */
	source: LayoutEdgeAnchor;
	/** Where it enters the target box. */
	target: LayoutEdgeAnchor;
	/**
	 * Corners of a right-angled route from the source side to the target side that
	 * stays clear of the boxes in between and of the other routes crossing the same gaps
	 * (see spreadGapLanes), excluding the two ends themselves; empty when the edge runs
	 * straight.
	 */
	points: Point[];
	/**
	 * Where along the route the label sits, 0 at the source and 1 at the target: the spot
	 * the layout kept free for it. Only for an edge given a `label`.
	 */
	labelPosition?: number;
};

export type LayeredLayoutResult = {
	nodes: LaidOutNode[];
	/** Every edge given, except self loops, which the layout leaves to the caller. */
	edges: LaidOutEdge[];
};

/** Which sides face each other along the rank axis, read off the two boxes' centres. */
const calcFacingSides = (
	source: Rect,
	target: Rect,
	direction: LayoutDirection,
): { sourceSide: LayoutSide; targetSide: LayoutSide } => {
	if (isVerticalFlow(direction)) {
		const deltaY =
			target.y + target.height / 2 - (source.y + source.height / 2);
		return deltaY >= 0
			? { sourceSide: "bottom", targetSide: "top" }
			: { sourceSide: "top", targetSide: "bottom" };
	}
	const deltaX = target.x + target.width / 2 - (source.x + source.width / 2);
	return deltaX >= 0
		? { sourceSide: "right", targetSide: "left" }
		: { sourceSide: "left", targetSide: "right" };
};

/** Where an anchor sits on a box, in the same frame as `bounds`. */
const calcAnchorPoint = (bounds: Rect, anchor: LayoutEdgeAnchor): Point => {
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

/** A side of one box, as the key the anchor rules count edges on. */
const sideKey = (nodeId: string, side: LayoutSide): string =>
	`${nodeId}:${side}`;

const clampRatio = (
	ratio: number,
	range: { readonly min: number; readonly max: number },
): number => Math.min(range.max, Math.max(range.min, ratio));

const isWithin = (
	ratio: number,
	range: { readonly min: number; readonly max: number },
): boolean => ratio >= range.min && ratio <= range.max;

/** Where `column` (a coordinate across the rank axis) falls along the box's side, 0..1. */
const calcSideRatio = (
	bounds: Rect,
	column: number,
	direction: LayoutDirection,
): number =>
	isVerticalFlow(direction)
		? (column - bounds.x) / bounds.width
		: (column - bounds.y) / bounds.height;

/**
 * The anchor for one end of an edge, given the column the edge travels in beyond
 * that end. On the column itself when the column crosses the side, so the edge
 * leaves straight; else at the side's midpoint when this is the side's only edge,
 * since a jog in the gap is then unavoidable and a centred one reads best; else
 * leaning toward the column, so the edges sharing the side fan out.
 */
const calcEndAnchor = (
	bounds: Rect,
	side: LayoutSide,
	column: number,
	isOnlyEdgeOnSide: boolean,
	direction: LayoutDirection,
): LayoutEdgeAnchor => {
	const ratio = calcSideRatio(bounds, column, direction);
	if (isWithin(ratio, EDGE_ANCHOR_STRAIGHT_RANGE)) {
		return { side, t: ratio };
	}
	if (isOnlyEdgeOnSide) {
		return { side, t: 0.5 };
	}
	return { side, t: clampRatio(ratio, EDGE_ANCHOR_FAN_RANGE) };
};

/**
 * The columns (coordinates across the rank axis) an edge travels in, between its
 * ends: the dummy slots dagre routed it through, read off its interior points.
 */
const readSlotColumns = (
	dagrePoints: readonly Point[],
	direction: LayoutDirection,
): number[] =>
	dagrePoints
		.slice(1, -1)
		// Even indexes are the gap midpoints, odd ones the dummy slots (see calcOrthogonalCorners).
		.filter((_, index) => index % 2 === 1)
		.map((point) => (isVerticalFlow(direction) ? point.x : point.y));

/** Drop every point that lies on the straight line between its neighbours. */
const dropCollinearPoints = (path: readonly Point[]): Point[] =>
	path.filter((point, index) => {
		if (index === 0 || index === path.length - 1) {
			return true;
		}
		const previous = path[index - 1];
		const next = path[index + 1];
		const sameColumn = previous.x === point.x && point.x === next.x;
		const sameRow = previous.y === point.y && point.y === next.y;
		return !(sameColumn || sameRow);
	});

/**
 * Turn the polyline dagre routed into a right-angled one that stays clear of the
 * boxes. Dagre's interior points alternate between the middle of a gap between two
 * ranks and the slot a dummy node holds inside a rank, so the route changes column
 * only in the gaps and crosses a rank only in a dummy's slot, where no box is.
 *
 * @param start - Where the edge leaves the source box
 * @param end - Where it enters the target box
 * @param dagrePoints - The route as dagre gives it, border to border
 * @param direction - Decides which axis is the rank axis
 * @returns The whole route, `start` and `end` included, with no redundant point on it
 */
const calcOrthogonalPath = (
	start: Point,
	end: Point,
	dagrePoints: readonly Point[],
	direction: LayoutDirection,
): Point[] => {
	const vertical = isVerticalFlow(direction);
	const interior = dagrePoints.slice(1, -1);
	// Even indexes are the gap midpoints, odd ones the dummy slots (see above).
	const gaps = interior.filter((_, index) => index % 2 === 0);
	const slots = interior.filter((_, index) => index % 2 === 1);
	const along = (point: Point): number => (vertical ? point.y : point.x);
	const across = (point: Point): number => (vertical ? point.x : point.y);
	const make = (acrossValue: number, alongValue: number): Point =>
		vertical
			? { x: acrossValue, y: alongValue }
			: { x: alongValue, y: acrossValue };

	const path: Point[] = [start];
	let column = across(start);
	gaps.forEach((gap, index) => {
		path.push(make(column, along(gap)));
		column = index < slots.length ? across(slots[index]) : across(end);
		path.push(make(column, along(gap)));
	});
	path.push(end);
	return dropCollinearPoints(path);
};

/**
 * Arrange a directed graph in layers (the Sugiyama scheme dagre implements): nodes are
 * ranked so edges point one way, ordered within each rank to reduce crossings, then
 * placed. The result is translated so the drawing's top-left is (0, 0); the caller
 * decides where it goes.
 *
 * @param nodes - The boxes to place, each with the size it keeps; ids must be distinct
 * @param edges - Directed edges between those ids. Several edges between the same pair are
 *   kept apart; an edge naming an id not in `nodes` is an error. An edge with a `label`
 *   gets room for it, in the gap it crosses or beside a rank it passes
 * @param options - Direction and gaps; see {@link LAYERED_LAYOUT_DEFAULTS}
 * @returns Every node's new top-left and, for every edge that is not a self loop, which
 *   sides of the two boxes now face each other
 */
export const computeLayeredLayout = (
	nodes: readonly LayoutGraphNode[],
	edges: readonly LayoutGraphEdge[],
	options: LayeredLayoutOptions = {},
): LayeredLayoutResult => {
	const { direction, nodeSpacing, rankSpacing } = {
		...LAYERED_LAYOUT_DEFAULTS,
		...options,
	};
	const graph = new Graph({ multigraph: true });
	graph.setGraph({
		rankdir: direction,
		nodesep: nodeSpacing,
		ranksep: rankSpacing,
		marginx: 0,
		marginy: 0,
	});
	graph.setDefaultEdgeLabel(() => ({}));
	const nodeIds = new Set<string>();
	for (const node of nodes) {
		if (nodeIds.has(node.id)) {
			throw new Error(`duplicate node id: ${node.id}`);
		}
		nodeIds.add(node.id);
		graph.setNode(node.id, { width: node.width, height: node.height });
	}
	const laidOutEdgeIds: string[] = [];
	for (const edge of edges) {
		for (const endId of [edge.sourceId, edge.targetId]) {
			if (!nodeIds.has(endId)) {
				throw new Error(`edge ${edge.id} names an unknown node: ${endId}`);
			}
		}
		if (edge.sourceId === edge.targetId) {
			continue;
		}
		graph.setEdge(
			edge.sourceId,
			edge.targetId,
			edge.label === undefined
				? {}
				: { width: edge.label.width, height: edge.label.height, labelpos: "c" },
			edge.id,
		);
		laidOutEdgeIds.push(edge.id);
	}

	layout(graph);

	// dagre hands back centres, offset by whatever margin its ranking left; pin the
	// drawing's top-left to the origin so the caller works in one known frame.
	const centred = nodes.map((node) => {
		const placed = graph.node(node.id) as { x: number; y: number };
		return {
			id: node.id,
			bounds: {
				x: placed.x - node.width / 2,
				y: placed.y - node.height / 2,
				width: node.width,
				height: node.height,
			},
		};
	});
	const originX = Math.min(...centred.map(({ bounds }) => bounds.x));
	const originY = Math.min(...centred.map(({ bounds }) => bounds.y));
	const laidOutNodes = centred.map(({ id, bounds }) => ({
		id,
		bounds: { ...bounds, x: bounds.x - originX, y: bounds.y - originY },
	}));
	const boundsById = new Map(
		laidOutNodes.map(({ id, bounds }) => [id, bounds] as const),
	);

	const centreOf = (bounds: Rect): number =>
		isVerticalFlow(direction)
			? bounds.x + bounds.width / 2
			: bounds.y + bounds.height / 2;
	const sidedEdges = edges
		.filter((edge) => laidOutEdgeIds.includes(edge.id))
		.map((edge) => {
			const sourceBounds = boundsById.get(edge.sourceId) as Rect;
			const targetBounds = boundsById.get(edge.targetId) as Rect;
			return {
				edge,
				sourceBounds,
				targetBounds,
				...calcFacingSides(sourceBounds, targetBounds, direction),
			};
		});
	// How many edges meet each side, which decides whether an end may sit at its midpoint.
	const edgeCountBySide = new Map<string, number>();
	for (const { edge, sourceSide, targetSide } of sidedEdges) {
		for (const key of [
			sideKey(edge.sourceId, sourceSide),
			sideKey(edge.targetId, targetSide),
		]) {
			edgeCountBySide.set(key, (edgeCountBySide.get(key) ?? 0) + 1);
		}
	}
	const isOnlyEdgeOnSide = (nodeId: string, side: LayoutSide): boolean =>
		edgeCountBySide.get(sideKey(nodeId, side)) === 1;

	const routedEdges = sidedEdges.map(
		({ edge, sourceBounds, targetBounds, sourceSide, targetSide }) => {
			const routed = graph.edge(edge.sourceId, edge.targetId, edge.id) as {
				points?: Point[];
				x?: number;
				y?: number;
			};
			const dagrePoints = (routed.points ?? []).map(({ x, y }) => ({
				x: x - originX,
				y: y - originY,
			}));
			const slotColumns = readSlotColumns(dagrePoints, direction);
			const sourceAlone = isOnlyEdgeOnSide(edge.sourceId, sourceSide);
			const targetAlone = isOnlyEdgeOnSide(edge.targetId, targetSide);
			let source: LayoutEdgeAnchor;
			let target: LayoutEdgeAnchor;
			if (slotColumns.length === 0) {
				// Boxes in neighbouring ranks: one straight line when either centre crosses
				// the other side and that other side is not shared, else each end on its own.
				const targetCentreRatio = calcSideRatio(
					sourceBounds,
					centreOf(targetBounds),
					direction,
				);
				const sourceCentreRatio = calcSideRatio(
					targetBounds,
					centreOf(sourceBounds),
					direction,
				);
				if (
					targetAlone &&
					isWithin(targetCentreRatio, EDGE_ANCHOR_STRAIGHT_RANGE)
				) {
					source = { side: sourceSide, t: targetCentreRatio };
					target = { side: targetSide, t: 0.5 };
				} else if (
					sourceAlone &&
					isWithin(sourceCentreRatio, EDGE_ANCHOR_STRAIGHT_RANGE)
				) {
					source = { side: sourceSide, t: 0.5 };
					target = { side: targetSide, t: sourceCentreRatio };
				} else {
					source = calcEndAnchor(
						sourceBounds,
						sourceSide,
						centreOf(targetBounds),
						sourceAlone,
						direction,
					);
					target = calcEndAnchor(
						targetBounds,
						targetSide,
						centreOf(sourceBounds),
						targetAlone,
						direction,
					);
				}
			} else {
				// Each end meets the slot column the edge travels in next to it.
				source = calcEndAnchor(
					sourceBounds,
					sourceSide,
					slotColumns[0],
					sourceAlone,
					direction,
				);
				target = calcEndAnchor(
					targetBounds,
					targetSide,
					slotColumns[slotColumns.length - 1],
					targetAlone,
					direction,
				);
			}
			return {
				id: edge.id,
				source,
				target,
				// Where dagre put the label: a spot on its own polyline, which the
				// right-angled route passes through or beside.
				labelPoint:
					edge.label !== undefined &&
					routed.x !== undefined &&
					routed.y !== undefined
						? { x: routed.x - originX, y: routed.y - originY }
						: undefined,
				path: calcOrthogonalPath(
					calcAnchorPoint(sourceBounds, source),
					calcAnchorPoint(targetBounds, target),
					dagrePoints,
					direction,
				),
			};
		},
	);
	spreadGapLanes(
		routedEdges.map(({ path }) => path),
		direction,
		rankSpacing,
	);
	const laidOutEdges: LaidOutEdge[] = routedEdges.map(
		({ path, labelPoint, ...edge }) => ({
			...edge,
			points: path.slice(1, -1),
			...(labelPoint !== undefined
				? { labelPosition: calcPositionAlongPath(path, labelPoint) }
				: {}),
		}),
	);

	return { nodes: laidOutNodes, edges: laidOutEdges };
};
