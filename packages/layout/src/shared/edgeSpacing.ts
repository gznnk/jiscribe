/**
 * How far along a side the ends of several edges sharing it may spread, as shares of
 * the side's body (a node's `anchorBodyRanges`, the whole side by default), cut down
 * to the side's usable stretch (its `anchorRanges`); the same shares of the usable
 * stretch where the two do not meet. A layered layout fans the ends over it
 * (see chooseEdgeAnchors); routing lets an end slide over it while the routes are
 * spread (see routeEdgesAroundNodes).
 */
export const EDGE_ANCHOR_FAN_RANGE = { min: 0.1, max: 0.9 } as const;

/**
 * Distance in px wanted between two edge ends on one side: room for two arrowheads. A
 * layered layout pushes apart ends nearer than this (see spreadSideEnds) and
 * createTakenEnds hands out places this far from those taken; routing spreads the
 * ends sharing a side up to it, as far as their slides leave room for (see
 * nudgeRoutes).
 */
export const EDGE_END_SPACING = 20;

/**
 * Preferred distance in px between two routes running side by side: through one gap
 * between ranks in a layered layout (see spreadGapLanes), or around boxes that stay
 * put (see nudgeRoutes).
 */
export const GAP_LANE_SPACING = 16;
