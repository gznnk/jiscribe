import { applyTextVerticalBasis } from "@jiscribe/doc/text/block/applyTextVerticalBasis";
import type { Dimensions, Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import type { ObjectTextRegionCalculator } from "../registry/ObjectTextRegionRegistry";

/**
 * Derives the region of one text slot in the shape's local coordinate space
 * (origin at the shape center, before transform). This is the single seam shared
 * by the rendering side (TextOverlay) and the editing side (TextEditor): both must
 * derive the region through this function so the text never jumps when
 * entering or leaving edit mode.
 *
 * The shape's own `textVerticalBasis` is applied here and nowhere else on the
 * canvas side, so every consumer of the region — the overlay, the editor, the
 * slot outline, and image export through the drawn overlay — places the body
 * against the same box (`applyTextVerticalBasis`).
 *
 * @param state - The object state (carries the untransformed width/height, and the vertical basis its body is placed on)
 * @param slotId - Which slot to place; a key of `state.text`. Single-slot shapes ignore it
 * @param calculator - Per-type calculator from ObjectTextRegionRegistry. Undefined = full bounding box for every slot
 * @returns The text region (top-left based, local coordinates)
 */
export const calcTextRegion = (
	state: ObjectState & Dimensions & Pick<TextStyleState, "textVerticalBasis">,
	slotId: string,
	calculator: ObjectTextRegionCalculator | undefined,
): Rect =>
	applyTextVerticalBasis(
		calculator?.(state, slotId) ?? calcFullTextRegion(state),
		state,
		state.textVerticalBasis,
	);

/**
 * The region a type registering no calculator gets: the whole box, for every
 * slot. Exported for the shapes that draw their own overlay and know they have
 * no calculator — going through {@link calcTextRegion} would make them name a
 * slot they have no use for.
 *
 * @param state - The object state; only the untransformed width/height are read
 * @returns The full box in local coordinates, top-left based
 */
export const calcFullTextRegion = (state: Dimensions): Rect => ({
	x: -state.width / 2,
	y: -state.height / 2,
	width: state.width,
	height: state.height,
});
