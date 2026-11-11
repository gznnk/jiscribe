import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutDirection } from "../shared/LayoutDirection";
import type {
	LayoutEdgeAnchor,
	LayoutSideAnchorRanges,
	LayoutVisualMargin,
} from "../shared/types";

export type LayoutGraphNode = {
	id: string;
	/** Width of the box the node occupies, in px; the layout never resizes it. */
	width: number;
	/** Height of the box, in px. */
	height: number;
	/**
	 * What the node draws outside its box, which the layout keeps room for as part of
	 * the node: neighbouring nodes, the border of the container around it and other
	 * edges' routes stay out of the box grown by it. An edge ending on a side it grows
	 * runs straight through that much before its first bend, and its label is not put
	 * there. The box is still what is placed and what edges end on, and the box's centre
	 * is what a rank is lined up on. Each side must be a finite number of 0 or more; left
	 * out, the node is its box.
	 */
	visualMargin?: LayoutVisualMargin;
	/** Id of the container the node sits inside, when it does; must be among the containers. */
	parentId?: string;
	/**
	 * The stretch of each side an edge may end on, for a node whose drawn outline does
	 * not reach along the whole side (a parallelogram's top and bottom): every anchor
	 * the layout chooses on that side stays inside it. It only moves an end that would
	 * fall outside it; where the layout would put an end is measured on
	 * {@link LayoutGraphNode.anchorBodyRanges}. A side left out, or the field left
	 * out, is usable from end to end (0..1).
	 */
	anchorRanges?: LayoutSideAnchorRanges;
	/**
	 * The stretch of each side the node's body covers (a loop limit's sides below the
	 * cut corners): the layout centres a side's only end on it and fans several out
	 * over it, as it would over a whole side, before {@link LayoutGraphNode.anchorRanges}
	 * moves any of them back onto the outline. Need not lie within `anchorRanges`. A
	 * side left out, or the field left out, spans the whole side (0..1).
	 */
	anchorBodyRanges?: LayoutSideAnchorRanges;
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
	/**
	 * The node's box. The boxes and containers together start at (0, 0); a node's
	 * {@link LayoutGraphNode.visualMargin} may reach past that into negative coordinates.
	 */
	bounds: Rect;
};

export type LaidOutEdge = {
	id: string;
	/**
	 * Where the edge leaves the source box, on the side facing the target along the rank
	 * axis. `t` lies within `EDGE_ANCHOR_STRAIGHT_RANGE` when that lets the edge leave in
	 * a straight line, otherwise at the middle of the side's
	 * {@link LayoutGraphNode.anchorBodyRanges} for the only edge on its side and within
	 * `EDGE_ANCHOR_FAN_RANGE` of that body for one of several, each brought back inside
	 * {@link LayoutGraphNode.anchorRanges} when it falls outside them (see
	 * chooseEdgeAnchors).
	 */
	source: LayoutEdgeAnchor;
	/** Where it enters the target box, its `t` chosen as `source`'s is. */
	target: LayoutEdgeAnchor;
	/**
	 * Corners of a right-angled route from the source side to the target side that
	 * stays clear of the boxes in between, of their visual margins and of the other
	 * routes crossing the same gaps (see spreadGapLanes), excluding the two ends
	 * themselves; empty when the edge runs straight. It crosses the visual margin of
	 * the side it ends on straight, its first and last corners lying past it.
	 */
	points: Point[];
	/**
	 * Where along the route the label sits, 0 at the source and 1 at the target: the spot
	 * the layout kept free for it, or the nearest stretch that holds it clear of every
	 * corner (see calcLabelPosition), never on the stretch an end runs through its own
	 * node's visual margin. Only for an edge given a `label`.
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
