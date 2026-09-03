import type { BoundingBox } from "../types/BoundingBox";
import type { Rect } from "../types/Rect";

/**
 * Converts a {@link BoundingBox} (four edges) to a {@link Rect} (top-left plus
 * extent) — the form a size is read off, and the one the public APIs hand back.
 *
 * @param box - The box to convert; one whose edges are inverted (`right` left
 *   of `left`) yields a negative extent rather than being normalized, so a
 *   malformed box stays visible instead of being quietly repaired
 */
export const convertBoundingBoxToRect = (box: BoundingBox): Rect => ({
	x: box.left,
	y: box.top,
	width: box.right - box.left,
	height: box.bottom - box.top,
});
