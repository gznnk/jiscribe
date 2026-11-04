// dagre ships one declaration file, typed as ESM. Under the Node16 resolution the VSCode
// extension typechecks with, this file counts as CommonJS and the static import is
// reported (TS1479) although the exports map serves a require build; every other
// consumer resolves in bundler mode and sees no error, so the directive is ts-ignore
// (ts-expect-error would then be the unused one).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Graph, layout } from "@dagrejs/dagre";
import type { Point, Rect } from "@jiscribe/geometry";

import { type LabelPlacement, calcLabelPosition } from "./calcLabelPosition";
import {
	type LayoutDirection,
	isSameCoordinate,
	isVerticalFlow,
} from "./LayoutDirection";
import { spreadGapLanes } from "./spreadGapLanes";
import { spreadSideEnds } from "./spreadSideEnds";

export { LayoutDirections, type LayoutDirection } from "./LayoutDirection";

/** Side of a node's box an edge leaves from or arrives at, in the node's own frame. */
export type LayoutSide = "top" | "right" | "bottom" | "left";

export type LayoutGraphNode = {
	id: string;
	/** Width of the box the node occupies, in px; the layout never resizes it. */
	width: number;
	/** Height of the box, in px. */
	height: number;
	/** Id of the frame the node sits inside, when it does; must be among the frames. */
	parentId?: string;
};

/**
 * A frame other nodes sit inside: the layout keeps its members together inside it
 * and sizes it to them. It has no size of its own on input, and no edge may end on it.
 */
export type LayoutGraphFrame = {
	id: string;
	/** Id of the frame this one sits inside, when it does. */
	parentId?: string;
	/**
	 * Height in px of the title band along the frame's top edge; the layout keeps that
	 * much clear below the edge, whichever way the ranks run. Defaults to 0.
	 */
	titleHeight?: number;
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

/** Least distance in px between two edge ends on one side: room for two arrowheads. */
export const EDGE_END_SPACING = 20;

/** Least distance in px between two edges joining the same pair of boxes. */
export const EDGE_BUNDLE_SPACING = EDGE_END_SPACING;

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
	 * the layout kept free for it, or the nearest stretch that holds it clear of every
	 * corner (see calcLabelPosition). Only for an edge given a `label`.
	 */
	labelPosition?: number;
	/**
	 * Signed distance in px the label is set off its line; 0 but for a route too short
	 * to hold the label on any segment. Only for an edge given a `label`.
	 */
	labelOffset?: number;
};

export type LaidOutFrame = {
	id: string;
	/** The box the frame's members fit in, with the layout's own margin around them. */
	bounds: Rect;
};

export type LayeredLayoutResult = {
	nodes: LaidOutNode[];
	/** Every edge given, except self loops, which the layout leaves to the caller. */
	edges: LaidOutEdge[];
	/** Every frame given, sized and placed around its members. */
	frames: LaidOutFrame[];
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
/** An end's anchor, and whether the edge runs straight out of it (so moving it would bend the edge). */
type EndAnchor = { anchor: LayoutEdgeAnchor; isStraight: boolean };

const calcEndAnchor = (
	bounds: Rect,
	side: LayoutSide,
	column: number,
	isOnlyEdgeOnSide: boolean,
	direction: LayoutDirection,
): EndAnchor => {
	const ratio = calcSideRatio(bounds, column, direction);
	if (isWithin(ratio, EDGE_ANCHOR_STRAIGHT_RANGE)) {
		return { anchor: { side, t: ratio }, isStraight: true };
	}
	if (isOnlyEdgeOnSide) {
		return { anchor: { side, t: 0.5 }, isStraight: false };
	}
	return {
		anchor: { side, t: clampRatio(ratio, EDGE_ANCHOR_FAN_RANGE) },
		isStraight: false,
	};
};

/**
 * Whether a rank coordinate is a row boxes sit on (a rank of nodes, or the border
 * rank dagre gives a frame), as opposed to the middle of a gap between rows.
 */
type IsSlotRow = (along: number) => boolean;

/**
 * The columns (coordinates across the rank axis) an edge travels in, between its
 * ends: the dummy slots dagre routed it through, read off its interior points.
 */
const readSlotColumns = (
	dagrePoints: readonly Point[],
	direction: LayoutDirection,
	isSlotRow: IsSlotRow,
): number[] =>
	dagrePoints
		.slice(1, -1)
		.filter((point) => isSlotRow(isVerticalFlow(direction) ? point.y : point.x))
		.map((point) => (isVerticalFlow(direction) ? point.x : point.y));

/** Drop every point that lies on the straight line between its neighbours. */
const dropCollinearPoints = (path: readonly Point[]): Point[] =>
	path.filter((point, index) => {
		if (index === 0 || index === path.length - 1) {
			return true;
		}
		const previous = path[index - 1];
		const next = path[index + 1];
		const sameColumn =
			isSameCoordinate(previous.x, point.x) &&
			isSameCoordinate(point.x, next.x);
		const sameRow =
			isSameCoordinate(previous.y, point.y) &&
			isSameCoordinate(point.y, next.y);
		return !(sameColumn || sameRow);
	});

/**
 * Turn the polyline dagre routed into a right-angled one that stays clear of the
 * boxes. Dagre's interior points sit either in the middle of a gap between two rows
 * or in the slot a dummy node holds on a row (a rank of nodes, or a frame's border),
 * so the route changes column only in the gaps, to the column of the next slot it
 * passes, and crosses a row only in that slot, where no box is.
 *
 * @param start - Where the edge leaves the source box
 * @param end - Where it enters the target box
 * @param dagrePoints - The route as dagre gives it, border to border
 * @param direction - Decides which axis is the rank axis
 * @param isSlotRow - Tells a point on a row from one in a gap
 * @returns The whole route, `start` and `end` included, with no redundant point on it
 */
const calcOrthogonalPath = (
	start: Point,
	end: Point,
	dagrePoints: readonly Point[],
	direction: LayoutDirection,
	isSlotRow: IsSlotRow,
): Point[] => {
	const vertical = isVerticalFlow(direction);
	const interior = dagrePoints.slice(1, -1);
	const along = (point: Point): number => (vertical ? point.y : point.x);
	const across = (point: Point): number => (vertical ? point.x : point.y);
	const make = (acrossValue: number, alongValue: number): Point =>
		vertical
			? { x: acrossValue, y: alongValue }
			: { x: alongValue, y: acrossValue };

	const path: Point[] = [start];
	let column = across(start);
	interior.forEach((point, index) => {
		if (isSlotRow(along(point))) {
			return;
		}
		const nextSlot = interior
			.slice(index + 1)
			.find((candidate) => isSlotRow(along(candidate)));
		path.push(make(column, along(point)));
		column = nextSlot === undefined ? across(end) : across(nextSlot);
		path.push(make(column, along(point)));
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
 * @param frames - Frames nodes may sit inside (see {@link LayoutGraphFrame}); ids must be
 *   distinct from the nodes' and each other's, a parent must be another frame, every
 *   frame must hold a node or a frame, and an edge ending on a frame is an error. A
 *   frame's `titleHeight` is kept clear below its top edge
 * @returns Every node's new top-left, every frame's box, and, for every edge that is not
 *   a self loop, where it meets each box (on the facing sides, fanned out toward where it
 *   goes) and the corners of a route between them
 */
export const computeLayeredLayout = (
	nodes: readonly LayoutGraphNode[],
	edges: readonly LayoutGraphEdge[],
	options: LayeredLayoutOptions = {},
	frames: readonly LayoutGraphFrame[] = [],
): LayeredLayoutResult => {
	const { direction, nodeSpacing, rankSpacing } = {
		...LAYERED_LAYOUT_DEFAULTS,
		...options,
	};
	const graph = new Graph({ multigraph: true, compound: true });
	graph.setGraph({
		rankdir: direction,
		nodesep: nodeSpacing,
		ranksep: rankSpacing,
		marginx: 0,
		marginy: 0,
	});
	graph.setDefaultEdgeLabel(() => ({}));
	const frameIds = new Set<string>();
	for (const frame of frames) {
		if (frameIds.has(frame.id)) {
			throw new Error(`duplicate frame id: ${frame.id}`);
		}
		frameIds.add(frame.id);
		graph.setNode(frame.id, {});
	}
	const requireFrame = (ownerId: string, parentId: string): void => {
		if (!frameIds.has(parentId)) {
			throw new Error(`${ownerId} names an unknown frame: ${parentId}`);
		}
	};
	for (const frame of frames) {
		if (frame.parentId !== undefined) {
			requireFrame(frame.id, frame.parentId);
			graph.setParent(frame.id, frame.parentId);
		}
	}
	const nodeIds = new Set<string>();
	for (const node of nodes) {
		if (nodeIds.has(node.id) || frameIds.has(node.id)) {
			throw new Error(`duplicate node id: ${node.id}`);
		}
		nodeIds.add(node.id);
		graph.setNode(node.id, { width: node.width, height: node.height });
		if (node.parentId !== undefined) {
			requireFrame(node.id, node.parentId);
			graph.setParent(node.id, node.parentId);
		}
	}
	// dagre sizes a frame from what it holds, so an empty one has no size to give.
	for (const frame of frames) {
		if (graph.children(frame.id).length === 0) {
			throw new Error(`frame ${frame.id} holds nothing`);
		}
	}
	const laidOutEdgeIds: string[] = [];
	for (const edge of edges) {
		for (const endId of [edge.sourceId, edge.targetId]) {
			if (frameIds.has(endId)) {
				throw new Error(`edge ${edge.id} ends on a frame: ${endId}`);
			}
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
	const centredFrames = frames.map((frame) => {
		const placed = graph.node(frame.id) as {
			x: number;
			y: number;
			width: number;
			height: number;
		};
		return {
			id: frame.id,
			bounds: {
				x: placed.x - placed.width / 2,
				y: placed.y - placed.height / 2,
				width: placed.width,
				height: placed.height,
			},
		};
	});
	const everyBox = [...centred, ...centredFrames].map(({ bounds }) => bounds);
	const originX = Math.min(...everyBox.map((bounds) => bounds.x));
	const originY = Math.min(...everyBox.map((bounds) => bounds.y));
	const laidOutNodes = centred.map(({ id, bounds }) => ({
		id,
		bounds: { ...bounds, x: bounds.x - originX, y: bounds.y - originY },
	}));
	const laidOutFrames: LaidOutFrame[] = centredFrames.map(({ id, bounds }) => ({
		id,
		bounds: { ...bounds, x: bounds.x - originX, y: bounds.y - originY },
	}));
	const boundsById = new Map(
		laidOutNodes.map(({ id, bounds }) => [id, bounds] as const),
	);
	// The rows boxes sit on: every rank of nodes. The border ranks dagre adds around a
	// frame hold nothing a route could hit, and the half gaps beside them are too
	// narrow to bend in, so their points are dropped from every route: a route then
	// crosses a border wherever its column is and bends in the gaps between ranks.
	const alongStart = (bounds: Rect): number =>
		isVerticalFlow(direction) ? bounds.y : bounds.x;
	const alongExtent = (bounds: Rect): number =>
		isVerticalFlow(direction) ? bounds.height : bounds.width;
	const slotRows = laidOutNodes.map(
		({ bounds }) => alongStart(bounds) + alongExtent(bounds) / 2,
	);
	const isSlotRow: IsSlotRow = (along) =>
		slotRows.some((row) => isSameCoordinate(row, along));
	const borderRows = laidOutFrames.flatMap(({ bounds }) => [
		alongStart(bounds),
		alongStart(bounds) + alongExtent(bounds),
	]);
	const isBorderRow = (along: number): boolean =>
		borderRows.some((row) => isSameCoordinate(row, along));

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

	const anchoredEdges = sidedEdges.map(
		({ edge, sourceBounds, targetBounds, sourceSide, targetSide }) => {
			const routed = graph.edge(edge.sourceId, edge.targetId, edge.id) as {
				points?: Point[];
				x?: number;
				y?: number;
			};
			const dagrePoints = (routed.points ?? [])
				.map(({ x, y }) => ({ x: x - originX, y: y - originY }))
				.filter(
					(point, index, points) =>
						index === 0 ||
						index === points.length - 1 ||
						!isBorderRow(isVerticalFlow(direction) ? point.y : point.x),
				);
			const slotColumns = readSlotColumns(dagrePoints, direction, isSlotRow);
			const sourceAlone = isOnlyEdgeOnSide(edge.sourceId, sourceSide);
			const targetAlone = isOnlyEdgeOnSide(edge.targetId, targetSide);
			let source: EndAnchor;
			let target: EndAnchor;
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
					source = {
						anchor: { side: sourceSide, t: targetCentreRatio },
						isStraight: true,
					};
					target = { anchor: { side: targetSide, t: 0.5 }, isStraight: true };
				} else if (
					sourceAlone &&
					isWithin(sourceCentreRatio, EDGE_ANCHOR_STRAIGHT_RANGE)
				) {
					source = { anchor: { side: sourceSide, t: 0.5 }, isStraight: true };
					target = {
						anchor: { side: targetSide, t: sourceCentreRatio },
						isStraight: true,
					};
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
				edge,
				source: source.anchor,
				target: target.anchor,
				sourceStraight: source.isStraight,
				targetStraight: target.isStraight,
				sourceBounds,
				targetBounds,
				dagrePoints,
				isAdjacent: slotColumns.length === 0,
				// Where dagre put the label: a spot on its own polyline, which the
				// right-angled route passes through or beside.
				labelPoint:
					edge.label !== undefined &&
					routed.x !== undefined &&
					routed.y !== undefined
						? { x: routed.x - originX, y: routed.y - originY }
						: undefined,
			};
		},
	);

	// Edges joining the same two boxes in neighbouring ranks would land on one column;
	// slide each sideways by a share of the bundle's width, labels included, so they
	// run side by side.
	const bundles = new Map<string, typeof anchoredEdges>();
	for (const anchored of anchoredEdges) {
		if (!anchored.isAdjacent) {
			continue;
		}
		const key = [anchored.edge.sourceId, anchored.edge.targetId]
			.sort()
			.join("\u0000");
		bundles.set(key, [...(bundles.get(key) ?? []), anchored]);
	}
	const labelExtentOf = (edge: LayoutGraphEdge): number => {
		if (edge.label === undefined) {
			return 0;
		}
		return isVerticalFlow(direction) ? edge.label.width : edge.label.height;
	};
	for (const bundle of bundles.values()) {
		if (bundle.length < 2) {
			continue;
		}
		const offsets: number[] = [0];
		for (let index = 1; index < bundle.length; index += 1) {
			offsets.push(
				offsets[index - 1] +
					Math.max(
						EDGE_BUNDLE_SPACING,
						(labelExtentOf(bundle[index - 1].edge) +
							labelExtentOf(bundle[index].edge)) /
							2 +
							EDGE_BUNDLE_SPACING / 2,
					),
			);
		}
		const centre = offsets[offsets.length - 1] / 2;
		bundle.forEach((anchored, index) => {
			const shift = offsets[index] - centre;
			const shiftAnchor = (
				anchor: LayoutEdgeAnchor,
				bounds: Rect,
			): LayoutEdgeAnchor => ({
				side: anchor.side,
				t: clampRatio(
					anchor.t +
						shift / (isVerticalFlow(direction) ? bounds.width : bounds.height),
					{ min: 0, max: 1 },
				),
			});
			anchored.source = shiftAnchor(anchored.source, anchored.sourceBounds);
			anchored.target = shiftAnchor(anchored.target, anchored.targetBounds);
		});
	}

	// Ends that landed within EDGE_END_SPACING of each other on one side are pushed
	// apart (see spreadSideEnds).
	type SideEndRef = {
		anchored: (typeof anchoredEdges)[number];
		end: "source" | "target";
	};
	const endsBySide = new Map<string, SideEndRef[]>();
	for (const anchored of anchoredEdges) {
		for (const end of ["source", "target"] as const) {
			const nodeId =
				end === "source" ? anchored.edge.sourceId : anchored.edge.targetId;
			const key = sideKey(nodeId, anchored[end].side);
			endsBySide.set(key, [...(endsBySide.get(key) ?? []), { anchored, end }]);
		}
	}
	for (const refs of endsBySide.values()) {
		if (refs.length < 2) {
			continue;
		}
		const bounds =
			refs[0].end === "source"
				? refs[0].anchored.sourceBounds
				: refs[0].anchored.targetBounds;
		const spread = spreadSideEnds(
			refs.map(({ anchored, end }) => ({
				t: anchored[end].t,
				isStraight:
					end === "source" ? anchored.sourceStraight : anchored.targetStraight,
			})),
			isVerticalFlow(direction) ? bounds.width : bounds.height,
			EDGE_END_SPACING,
		);
		refs.forEach(({ anchored, end }, index) => {
			anchored[end] = { side: anchored[end].side, t: spread[index] };
		});
	}

	const routedEdges = anchoredEdges.map((anchored) => ({
		...anchored,
		path: calcOrthogonalPath(
			calcAnchorPoint(anchored.sourceBounds, anchored.source),
			calcAnchorPoint(anchored.targetBounds, anchored.target),
			anchored.dagrePoints,
			direction,
			isSlotRow,
		),
	}));
	spreadGapLanes(
		routedEdges.map(({ path }) => path),
		direction,
		rankSpacing,
		routedEdges.map(({ edge, labelPoint }) =>
			labelPoint !== undefined && edge.label !== undefined
				? {
						point: labelPoint,
						alongExtent: isVerticalFlow(direction)
							? edge.label.height
							: edge.label.width,
					}
				: undefined,
		),
		[...laidOutNodes, ...laidOutFrames].map(({ bounds }) => bounds),
	);
	const toLabelFields = ({
		position,
		offset,
	}: LabelPlacement): Pick<LaidOutEdge, "labelPosition" | "labelOffset"> => ({
		labelPosition: position,
		labelOffset: offset,
	});
	// Room for every frame's title band: everything below a frame's top edge, its own
	// members first of all, moves down by the band's height, and the frames spanning
	// that edge grow by it. Top to bottom, so a frame inside another is moved by the
	// outer band before it makes room for its own.
	const titleHeightById = new Map(
		frames.map((frame) => [frame.id, frame.titleHeight ?? 0] as const),
	);
	const movablePoints = new Set<Point>();
	for (const { path, labelPoint } of routedEdges) {
		for (const point of path) {
			movablePoints.add(point);
		}
		if (labelPoint !== undefined) {
			movablePoints.add(labelPoint);
		}
	}
	const movableBoxes = [...laidOutNodes, ...laidOutFrames].map(
		({ bounds }) => bounds,
	);
	for (const frame of [...laidOutFrames].sort(
		(a, b) => a.bounds.y - b.bounds.y,
	)) {
		const titleHeight = titleHeightById.get(frame.id) ?? 0;
		if (titleHeight <= 0) {
			continue;
		}
		const edgeY = frame.bounds.y;
		const isBelowEdge = (y: number): boolean =>
			y > edgeY && !isSameCoordinate(y, edgeY);
		for (const point of movablePoints) {
			if (isBelowEdge(point.y)) {
				point.y += titleHeight;
			}
		}
		for (const box of movableBoxes) {
			const bottom = box.y + box.height;
			if (isBelowEdge(box.y)) {
				box.y += titleHeight;
			} else if (isBelowEdge(bottom)) {
				box.height += titleHeight;
			}
		}
	}

	const laidOutEdges: LaidOutEdge[] = routedEdges.map(
		({
			edge,
			source,
			target,
			path,
			labelPoint,
			sourceBounds,
			targetBounds,
		}) => ({
			id: edge.id,
			source,
			target,
			points: path.slice(1, -1),
			...(labelPoint !== undefined && edge.label !== undefined
				? toLabelFields(
						calcLabelPosition(
							path,
							labelPoint,
							edge.label,
							direction,
							rankSpacing,
							[sourceBounds, targetBounds],
						),
					)
				: {}),
		}),
	);

	return { nodes: laidOutNodes, edges: laidOutEdges, frames: laidOutFrames };
};
