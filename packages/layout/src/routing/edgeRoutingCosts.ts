/**
 * How far in px a route is searched to keep from a box it passes, running nearer
 * costing it the more the nearer (see ROUTE_COSTS), and how far an end runs straight
 * out of its side before the route may bend where nothing stands near it in its way,
 * and further in a channel (see calcStubLength). Spreading parallel runs and straightening
 * jogs once every edge is routed may bring a run nearer a box than this (see
 * nudgeRoutes). A label's spot keeps this far along the route from either end of it
 * (see placeRouteLabels). The canvas's own routing reads it as its
 * `DEFAULT_CONNECTOR_MARGIN`.
 */
export const EDGE_ROUTE_MARGIN = 30;

/**
 * How near a box, in px, a run reads as touching it: a third of the margin. Within it
 * the run pays `ROUTE_COSTS.hugWeight` on top (see calcBandWeight).
 */
export const ROUTE_HUG_REACH = EDGE_ROUTE_MARGIN / 3;

/**
 * What a route pays besides its length (1 per px), in px of length. From the dearest:
 * crossing a route already drawn, a bend, an end leaving a bottom side through its
 * caption, crossing a border; and per px run, on top of the length: along a route
 * already drawn, and near a box or alongside a border, weighed by how near (1 against
 * it, falling to 0 a margin away; a box's weight gains `hugWeight` on top within
 * ROUTE_HUG_REACH of it, where it is the dearest of the per-px costs).
 */
export const ROUTE_COSTS = {
	crossing: 300,
	bend: 150,
	labelledBottom: 100,
	borderCrossing: 60,
	overlapPerPx: 4,
	bandPerPx: 3,
	/**
	 * What the weight of a point nearer a box than ROUTE_HUG_REACH gains on top: this
	 * much against the box, falling to 0 at that reach, so a run that would read as
	 * touching the box takes a jog instead. The borders' weights gain nothing.
	 */
	hugWeight: 4,
	/**
	 * What a px costs along a route already drawn to the same pinned end (a bundle),
	 * in place of the length's 1 and with no overlap paid: less than a px of its own
	 * way, so the routes to one spot gather into one trunk.
	 */
	bundledPerPx: 0.5,
} as const;
