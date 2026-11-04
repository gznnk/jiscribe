import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutDirection } from "./LayoutDirection";

/** Side of a node's box an edge leaves from or arrives at, in the node's own coordinates. */
export type LayoutSide = "top" | "right" | "bottom" | "left";

export type LayoutGraphNode = {
	id: string;
	/** Width of the box the node occupies, in px; the layout never resizes it. */
	width: number;
	/** Height of the box, in px. */
	height: number;
	/** Id of the container the node sits inside, when it does; must be among the containers. */
	parentId?: string;
};

/**
 * A container other nodes sit inside: the layout keeps its members together inside it
 * and sizes it to them. It has no size of its own on input, and no edge may end on it.
 */
export type LayoutGraphContainer = {
	id: string;
	/** Id of the container this one sits inside, when it does. */
	parentId?: string;
	/**
	 * Height in px of the title band along the container's top edge; the layout keeps that
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
	/** Defaults to {@link LAYERED_LAYOUT_DEFAULTS}. */
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
	 * `EDGE_ANCHOR_STRAIGHT_RANGE` when that lets the edge leave in a straight line,
	 * otherwise 0.5 for the only edge on its side and within `EDGE_ANCHOR_FAN_RANGE`
	 * for one of several (see chooseEdgeAnchors).
	 */
	t: number;
};

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

export type LaidOutContainer = {
	id: string;
	/** The box the container's members fit in, with the layout's own margin around them. */
	bounds: Rect;
};

export type LayeredLayoutResult = {
	nodes: LaidOutNode[];
	/** Every edge given, except self loops, which the layout leaves to the caller. */
	edges: LaidOutEdge[];
	/** Every container given, sized and placed around its members. */
	containers: LaidOutContainer[];
};
