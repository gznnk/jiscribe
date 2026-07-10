import type { Dimensions, Rect } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import type { TextRegionSpec } from "../../../schemas/objects/types/TextRegionSpec";

/**
 * Calculates a shape's text region in its local coordinate space (origin at
 * the shape center, before transform). This is the single seam shared by the
 * rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function so the text never jumps when
 * entering or leaving edit mode.
 *
 * @param dimensions - The shape's untransformed width and height
 * @param spec - Region spec from ObjectFeatures. Omitted = full bounding box
 * @returns The text region (top-left based, local coordinates)
 */
export const calcTextRegion = (
	dimensions: Dimensions,
	spec?: TextRegionSpec,
): Rect => {
	const localFrame = {
		cx: 0,
		cy: 0,
		width: dimensions.width,
		height: dimensions.height,
	};
	return calcInsetRect(localFrame, spec?.inset ?? {});
};
