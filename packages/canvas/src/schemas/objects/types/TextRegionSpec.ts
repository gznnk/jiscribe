import type { RatioInsets } from "@workspace/geometry";

/**
 * Declares how a shape's text region is derived from its frame.
 * Omitting the spec means the text region is the full bounding box
 * (the existing behavior).
 *
 * Currently only ratio insets are supported: the region follows the
 * shape size (e.g. the body of a DB cylinder). A fixed-px variant will
 * be added to the union when a size-independent region (e.g. caption)
 * becomes necessary.
 */
export type TextRegionSpec = {
	unit: "ratio";
	/** Ratio insets for each edge (omitted edges mean 0) */
	inset: RatioInsets;
};
