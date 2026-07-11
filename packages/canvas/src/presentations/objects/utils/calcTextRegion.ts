import type { Dimensions, Rect } from "@workspace/geometry";

import type { TextRegionCalculator } from "../registry/TextRegionRegistry";

/**
 * Derives a shape's text region in its local coordinate space (origin at
 * the shape center, before transform). This is the single seam shared by the
 * rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function so the text never jumps when
 * entering or leaving edit mode.
 *
 * @param dimensions - The shape's untransformed width and height
 * @param calculator - Per-type calculator from TextRegionRegistry. Omitted = full bounding box
 * @returns The text region (top-left based, local coordinates)
 */
export const calcTextRegion = (
	dimensions: Dimensions,
	calculator?: TextRegionCalculator,
): Rect =>
	calculator?.(dimensions) ?? {
		x: -dimensions.width / 2,
		y: -dimensions.height / 2,
		width: dimensions.width,
		height: dimensions.height,
	};
