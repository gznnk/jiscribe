/** Side of a node's box an edge leaves from or arrives at, in the node's own coordinates. */
export type LayoutSide = "top" | "right" | "bottom" | "left";

/** A stretch of one side, as ratios of the side measured as in {@link LayoutEdgeAnchor}; `min <= max`. */
export type LayoutAnchorRange = { min: number; max: number };

/** A stretch of each side of a node; the field holding it says what a side left out means. */
export type LayoutSideAnchorRanges = Partial<
	Record<LayoutSide, LayoutAnchorRange>
>;

/**
 * How far in px a node is drawn past each side of its box (a caption hung below it).
 * A side left out is 0.
 */
export type LayoutVisualMargin = Partial<Record<LayoutSide, number>>;

/** Where an edge meets a box: a side and a position along it. */
export type LayoutEdgeAnchor = {
	side: LayoutSide;
	/**
	 * Position along the side, 0..1 measured left to right on `top` / `bottom` and top to
	 * bottom on `left` / `right`; 0.5 is the side's midpoint. Always within the node's
	 * `anchorRanges` for the side. A layered layout chooses it as chooseEdgeAnchors
	 * says; routing as routeEdgesAroundNodes says.
	 */
	t: number;
};
