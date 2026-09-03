import type { BoundingBox } from "../types/BoundingBox";
import type { Rect } from "../types/Rect";

/**
 * Converts a {@link Rect} (top-left plus extent) to a {@link BoundingBox}
 * (four edges).
 *
 * @param rect - The rect to convert; a negative `width` / `height` (a region
 *   taken from two drag points, say) is normalized, a bounding box having no
 *   notion of direction — `left` is always ≤ `right`
 */
export const convertRectToBoundingBox = (rect: Rect): BoundingBox => ({
	left: Math.min(rect.x, rect.x + rect.width),
	top: Math.min(rect.y, rect.y + rect.height),
	right: Math.max(rect.x, rect.x + rect.width),
	bottom: Math.max(rect.y, rect.y + rect.height),
});
