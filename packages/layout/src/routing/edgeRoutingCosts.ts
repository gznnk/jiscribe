/**
 * How far in px a route is searched to keep from a box it passes, running nearer
 * costing it the more the nearer (see ROUTE_COSTS), and how far an end runs straight
 * out of its side before the route may bend. Spreading parallel runs and straightening
 * jogs once every edge is routed may bring a run nearer a box than this (see
 * nudgeRoutes). A label's spot keeps this far along the route from either end of it
 * (see placeRouteLabels). The canvas's own routing reads it as its
 * `DEFAULT_CONNECTOR_MARGIN`.
 */
export const EDGE_ROUTE_MARGIN = 30;

/**
 * What a route pays besides its length (1 per px), in px of length. From the dearest:
 * crossing a route already drawn, a bend, an end leaving a bottom side through its
 * caption, crossing a border; and per px run, on top of the length: along a route
 * already drawn, then near a box or alongside a border, the latter weighed by how near
 * (1 against it, falling to 0 a margin away).
 */
export const ROUTE_COSTS = {
	crossing: 300,
	bend: 150,
	labelledBottom: 100,
	borderCrossing: 60,
	overlapPerPx: 4,
	bandPerPx: 3,
	/**
	 * What a px costs along a route already drawn to the same pinned end (a bundle),
	 * in place of the length's 1 and with no overlap paid: less than a px of its own
	 * way, so the routes to one spot gather into one trunk.
	 */
	bundledPerPx: 0.5,
} as const;
