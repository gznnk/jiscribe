import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutEdgeAnchor, LayoutSideAnchorRanges } from "../shared/types";

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
	/**
	 * The stretch of each side an end may sit on, for a node whose drawn outline does not
	 * reach along the whole side: no end leaves it. A side left out, or the field left
	 * out, is usable from end to end (0..1).
	 */
	anchorRanges?: LayoutSideAnchorRanges;
	/**
	 * The stretch of each side the node's body covers: an end is centred on it and slides
	 * over it, before {@link RoutableNode.anchorRanges} moves it back onto the outline.
	 * Need not lie within `anchorRanges`. A side left out, or the field left out, spans
	 * the whole side (0..1).
	 */
	anchorBodyRanges?: LayoutSideAnchorRanges;
};

/** An edge to route, between two of the nodes given. */
export type RoutableEdge = {
	id: string;
	/** Id of the node the edge starts at; must be among the nodes. */
	sourceId: string;
	/** Id of the node the edge ends at; must be among the nodes. */
	targetId: string;
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
	 * placeRouteLabels); where that is chosen is described at routeEdgesAroundNodes.
	 * Only for an edge given a `label`.
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
