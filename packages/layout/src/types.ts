import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutDirection } from "./LayoutDirection";

/** Side of a node's box an edge leaves from or arrives at, in the node's own coordinates. */
export type LayoutSide = "top" | "right" | "bottom" | "left";

/** A stretch of one side, as ratios of the side measured as in {@link LayoutEdgeAnchor}; `min <= max`. */
export type LayoutAnchorRange = { min: number; max: number };

/**
 * How far in px a node is drawn past each side of its box (a caption hung below it).
 * A side left out is 0.
 */
export type LayoutVisualMargin = Partial<Record<LayoutSide, number>>;

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
	anchorRanges?: Partial<Record<LayoutSide, LayoutAnchorRange>>;
	/**
	 * The stretch of each side the node's body covers (a loop limit's sides below the
	 * cut corners): the layout centres a side's only end on it and fans several out
	 * over it, as it would over a whole side, before {@link LayoutGraphNode.anchorRanges}
	 * moves any of them back onto the outline. Need not lie within `anchorRanges`. A
	 * side left out, or the field left out, spans the whole side (0..1).
	 */
	anchorBodyRanges?: Partial<Record<LayoutSide, LayoutAnchorRange>>;
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

/** Where an edge meets a box: a side and a position along it. */
export type LayoutEdgeAnchor = {
	side: LayoutSide;
	/**
	 * Position along the side, 0..1 measured left to right on `top` / `bottom` and top to
	 * bottom on `left` / `right`; 0.5 is the side's midpoint. Always within the node's
	 * {@link LayoutGraphNode.anchorRanges} for the side. Within
	 * `EDGE_ANCHOR_STRAIGHT_RANGE` when that lets the edge leave in a straight line,
	 * otherwise the middle of the side's {@link LayoutGraphNode.anchorBodyRanges} for
	 * the only edge on its side and within `EDGE_ANCHOR_FAN_RANGE` of that body for one
	 * of several, each brought back inside `anchorRanges` when it falls outside them
	 * (see chooseEdgeAnchors).
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

/** A box that stays where it stands while edges are routed to it and around it. */
export type RoutableNode = {
	id: string;
	/**
	 * The box, in the coordinates every node shares: edges end on its sides, and no
	 * route enters it.
	 */
	bounds: Rect;
	/**
	 * The caption the node hangs below its box, as the caption's own rect in the same
	 * coordinates (not the box grown by it). No route enters it, but for one stretch: an
	 * edge ending on the node's bottom side runs straight down through it, and that end
	 * is dearer than another side's. Left out, the node hangs none.
	 */
	labelBounds?: Rect;
	/** The stretch of each side an end may sit on; see {@link LayoutGraphNode.anchorRanges}. */
	anchorRanges?: LayoutGraphNode["anchorRanges"];
	/** The stretch of each side an end is centred on; see {@link LayoutGraphNode.anchorBodyRanges}. */
	anchorBodyRanges?: LayoutGraphNode["anchorBodyRanges"];
};

/** An edge to route, between two of the nodes given. */
export type RoutableEdge = Pick<
	LayoutGraphEdge,
	"id" | "sourceId" | "targetId"
> & {
	/**
	 * Size in px of the box the edge's label is drawn in. Routing makes no room for it:
	 * the label is placed on the finished route (see RoutedEdge.labelPosition). Left
	 * out, the edge has no label.
	 */
	label?: { width: number; height: number };
};

/** What else shapes the routes besides the nodes. */
export type EdgeRoutingOptions = {
	/**
	 * More rects no route enters (a container's title band), in the nodes' coordinates.
	 * Like a node's box, one is left out for an edge with an end on a node it covers.
	 */
	obstacles?: readonly Rect[];
	/**
	 * Rects whose outline a route pays a little to cross or to run alongside within a
	 * margin (a container's frame), in the nodes' coordinates; the inside is free to
	 * run through.
	 */
	borders?: readonly Rect[];
};

export type RoutedEdge = {
	id: string;
	/** Where the edge leaves the source box. */
	source: LayoutEdgeAnchor;
	/** Where it enters the target box. */
	target: LayoutEdgeAnchor;
	/**
	 * Corners of the right-angled route between the two ends, excluding the ends
	 * themselves, with no point repeated and none on the straight line between its
	 * neighbours; empty when the edge runs straight. The first leaves the source
	 * side at right angles, in line with the source end, and the last enters the
	 * target side likewise.
	 */
	points: Point[];
	/**
	 * Where along the route the label's centre sits, 0 at the source end and 1 at the
	 * target, as a share of the whole path's length, both ends included (see
	 * calcPositionAlongPath); where that is chosen is described at
	 * routeEdgesAroundNodes. Only for an edge given a `label`.
	 */
	labelPosition?: number;
	/**
	 * Signed distance in px the label's centre is set off the line at `labelPosition`,
	 * positive toward the left of the direction of travel ((-dy, dx), as a connector's
	 * label offset reads it); 0 on the line. Only for an edge given a `label`.
	 */
	labelOffset?: number;
};

export type EdgeRoutingResult = {
	/** The edges a route was found for, in the order given. */
	edges: RoutedEdge[];
	/**
	 * Ids of the edges no route was found for, in the order given: walled in by
	 * obstacles, or a self loop, which this routing does not draw.
	 */
	unroutedEdgeIds: string[];
};
