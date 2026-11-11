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
	 * The only places the source end may sit, each a side of the source node's box and
	 * a ratio 0..1 along it (a connect point the node's type declares): the route starts
	 * at the one that gives it the cheapest way, and the end is pinned there, not
	 * sliding along its side afterwards. A place whose stub cannot leave is dropped; an
	 * edge left with none, an empty list included, is unrouted. Routes pinned to one
	 * place gather into one trunk (see routeEdgesAroundNodes). Left out, the end sits
	 * wherever on the node's sides the route is cheapest.
	 */
	sourceEnds?: readonly LayoutEdgeAnchor[];
	/** The same for the target end, on the target node. */
	targetEnds?: readonly LayoutEdgeAnchor[];
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
	 * Horizontal bands a route crosses straight over, top to bottom or bottom to top,
	 * but neither runs along nor bends in (a container's title band, beside its title),
	 * in the nodes' coordinates. Crossing a band's top and its bottom side each costs
	 * what crossing a border's side does, counted once where a side of one of
	 * `borders` lies on it, and a run alongside within a margin what one alongside a
	 * border does; do not list a band among `borders` as well. Unlike one of
	 * `obstacles`, a band holds for an edge whose end node it covers too, so a node
	 * standing in a band can leave it only straight up or down. One reaching past
	 * every node is cut to the routed area.
	 */
	crossableBands?: readonly Rect[];
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
