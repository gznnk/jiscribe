/**
 * Insets given as ratios of a frame's dimensions: top / bottom are relative to
 * the height, left / right to the width. Omitted edges mean no inset (0).
 */
export type RatioInsets = {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
};
