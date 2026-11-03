// dagre ships one declaration file, typed as ESM. Under the Node16 resolution the VSCode
// extension typechecks with, this file counts as CommonJS and the static import is
// reported (TS1479) although the exports map serves a require build; every other
// consumer resolves in bundler mode and sees no error, so the directive is ts-ignore
// (ts-expect-error would then be the unused one).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Graph, layout } from "@dagrejs/dagre";
import type { Point, Rect } from "@jiscribe/geometry";

/**
 * Which way ranks are stacked: `TB` puts a source above its targets, `LR` to
 * their left; `BT` / `RL` are the same stacks read the other way.
 */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

export const LayoutDirections = [
	"TB",
	"BT",
	"LR",
	"RL",
] as const satisfies readonly LayoutDirection[];

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

export type LaidOutEdge = {
	id: string;
	/** Side of the source box the edge should leave from, as the laid-out positions face. */
	sourceSide: LayoutSide;
	/** Side of the target box the edge should arrive at. */
	targetSide: LayoutSide;
	/**
	 * Corners of a right-angled route from the source side to the target side that
	 * stays clear of the boxes in between, excluding the two ends themselves; empty when
	 * the edge runs straight.
	 */
	points: Point[];
};

export type LayeredLayoutResult = {
	nodes: LaidOutNode[];
	/** Every edge given, except self loops, which the layout leaves to the caller. */
	edges: LaidOutEdge[];
};

const isVerticalFlow = (direction: LayoutDirection): boolean =>
	direction === "TB" || direction === "BT";

/** Which sides face each other along the rank axis, read off the two boxes' centres. */
const calcFacingSides = (
	source: Rect,
	target: Rect,
	direction: LayoutDirection,
): Pick<LaidOutEdge, "sourceSide" | "targetSide"> => {
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

/** Where an edge meets a box on the given side: the midpoint of that side. */
const calcSidePoint = (bounds: Rect, side: LayoutSide): Point => {
	switch (side) {
		case "top":
			return { x: bounds.x + bounds.width / 2, y: bounds.y };
		case "bottom":
			return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
		case "left":
			return { x: bounds.x, y: bounds.y + bounds.height / 2 };
		case "right":
			return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
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
 * @returns The corners strictly between `start` and `end`; empty when the edge is a straight line
 */
const calcOrthogonalCorners = (
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
	return dropCollinearPoints(path).slice(1, -1);
};

/**
 * Arrange a directed graph in layers (the Sugiyama scheme dagre implements): nodes are
 * ranked so edges point one way, ordered within each rank to reduce crossings, then
 * placed. The result is translated so the drawing's top-left is (0, 0); the caller
 * decides where it goes.
 *
 * @param nodes - The boxes to place, each with the size it keeps; ids must be distinct
 * @param edges - Directed edges between those ids. Several edges between the same pair are
 *   kept apart; an edge naming an id not in `nodes` is an error
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
		graph.setEdge(edge.sourceId, edge.targetId, {}, edge.id);
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

	const laidOutEdges = edges
		.filter((edge) => laidOutEdgeIds.includes(edge.id))
		.map((edge) => {
			const routed = graph.edge(edge.sourceId, edge.targetId, edge.id) as {
				points?: Point[];
			};
			const sourceBounds = boundsById.get(edge.sourceId) as Rect;
			const targetBounds = boundsById.get(edge.targetId) as Rect;
			const sides = calcFacingSides(sourceBounds, targetBounds, direction);
			return {
				id: edge.id,
				...sides,
				points: calcOrthogonalCorners(
					calcSidePoint(sourceBounds, sides.sourceSide),
					calcSidePoint(targetBounds, sides.targetSide),
					(routed.points ?? []).map(({ x, y }) => ({
						x: x - originX,
						y: y - originY,
					})),
					direction,
				),
			};
		});

	return { nodes: laidOutNodes, edges: laidOutEdges };
};
