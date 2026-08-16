import type { BoundingBox } from "@jiscribe/geometry";

import { calcContentBounds } from "./calcContentBounds";
import type { ObjectVisualBoundsRegistry } from "../../presentations/objects/registry/ObjectVisualBoundsRegistry";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ScrollBoundsConfig } from "../CanvasTypes";

/** Margin left outside the content when `padding` is omitted (world units). */
const DEFAULT_SCROLL_BOUNDS_PADDING = 100;

/**
 * The rect panning is limited to, derived from the content extent.
 *
 * Walks every object, so callers keep the result and recompute it only when the
 * objects change — never per drag frame (see canvasReducer's scroll-bounds pass).
 *
 * @param config - Mount-time setting; `undefined` and `mode: "infinite"` both
 *   mean unrestricted
 * @param objects - The object map the extent is measured over
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry, so the wall
 *   accounts for whatever a shape draws outside its geometry box; omitting it
 *   measures the geometry alone
 * @returns The padded content extent, or null when panning is unrestricted —
 *   either by setting or because the doc has no content to bound it to
 */
export const calcScrollBounds = (
	config: ScrollBoundsConfig | undefined,
	objects: Record<string, ObjectState>,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): BoundingBox | null => {
	if (config?.mode !== "content") {
		return null;
	}

	const contentBounds = calcContentBounds(objects, visualBounds);
	if (contentBounds === null) {
		return null;
	}

	const padding = config.padding ?? DEFAULT_SCROLL_BOUNDS_PADDING;
	return {
		left: contentBounds.left - padding,
		top: contentBounds.top - padding,
		right: contentBounds.right + padding,
		bottom: contentBounds.bottom + padding,
	};
};
