/**
 * Insets expressed as ratios of a frame's dimensions.
 * Each edge is a ratio in [0, 1] relative to the frame height (top / bottom)
 * or the frame width (left / right). Omitted edges mean no inset (0).
 */
export type RatioInsets = {
	/** Inset from the top edge, as a ratio of the height */
	top?: number;
	/** Inset from the right edge, as a ratio of the width */
	right?: number;
	/** Inset from the bottom edge, as a ratio of the height */
	bottom?: number;
	/** Inset from the left edge, as a ratio of the width */
	left?: number;
};
