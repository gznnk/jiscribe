import type { ResolvedViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { BoundingBox } from "@jiscribe/geometry";

import { calcContentBounds } from "./calcContentBounds";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * The rect panning is limited to, derived from the content extent.
 *
 * Walks every object, so callers keep the result and recompute it only when the
 * objects change — never per drag frame (see limitViewScroll's lazy re-measure).
 *
 * @param padding - The wall's per-side margin as
 *   {@link resolveScrollWallPadding} decided it; null (panning unrestricted)
 *   returns null without measuring anything
 * @param objects - The object map the extent is measured over
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn
 *   (see calcContentBounds), so the wall accounts for whatever lies outside the
 *   geometry
 * @returns The padded content extent, or null when panning is unrestricted —
 *   either by setting or because the doc has no content to bound it to
 */
export const calcScrollBounds = (
	padding: ResolvedViewPadding | null,
	objects: Record<string, ObjectState>,
	visualExtentRegistries: VisualExtentRegistries,
): BoundingBox | null => {
	if (padding === null) {
		return null;
	}

	const contentBounds = calcContentBounds(objects, visualExtentRegistries);
	if (contentBounds === null) {
		return null;
	}

	return {
		left: contentBounds.left - padding.left,
		top: contentBounds.top - padding.top,
		right: contentBounds.right + padding.right,
		bottom: contentBounds.bottom + padding.bottom,
	};
};
