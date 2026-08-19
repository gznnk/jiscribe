import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ObjectTextRegionCalculator } from "../registry/ObjectTextRegionRegistry";

/**
 * Derives the region of one text slot in the shape's local coordinate space
 * (origin at the shape center, before transform). This is the single seam shared
 * by the rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function so the text never jumps when
 * entering or leaving edit mode.
 *
 * @param state - The object state (carries the untransformed width/height)
 * @param slotId - Which slot to place; a key of `state.text`. Single-slot shapes ignore it
 * @param calculator - Per-type calculator from ObjectTextRegionRegistry. Omitted = full bounding box for every slot
 * @returns The text region (top-left based, local coordinates)
 */
export const calcTextRegion = (
	state: ObjectState & Dimensions,
	slotId: string,
	calculator?: ObjectTextRegionCalculator,
): Rect =>
	calculator?.(state, slotId) ?? {
		x: -state.width / 2,
		y: -state.height / 2,
		width: state.width,
		height: state.height,
	};
