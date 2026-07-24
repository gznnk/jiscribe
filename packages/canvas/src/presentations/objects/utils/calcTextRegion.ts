import type { Dimensions, Rect } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ObjectTextRegionCalculator } from "../registry/ObjectTextRegionRegistry";

/**
 * Derives a shape's text region in its local coordinate space (origin at
 * the shape center, before transform). This is the single seam shared by the
 * rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function so the text never jumps when
 * entering or leaving edit mode.
 *
 * @param state - The object state (carries the untransformed width/height)
 * @param calculator - Per-type calculator from ObjectTextRegionRegistry. Omitted = full bounding box
 * @returns The text region (top-left based, local coordinates)
 */
export const calcTextRegion = (
	state: ObjectState & Dimensions,
	calculator?: ObjectTextRegionCalculator,
): Rect =>
	calculator?.(state) ?? {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};
