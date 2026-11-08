import type { Rect } from "../types/Rect";

/**
 * Whether two rects share some area: rects that only touch along an edge or at a
 * corner do not overlap.
 *
 * @param first - One rect, in the same coordinate space as `second`
 * @param second - The other. A zero-size rect overlaps a rect it lies strictly
 *   inside, and nothing whose edge it lies on
 */
export const doRectsOverlap = (first: Rect, second: Rect): boolean =>
	first.x < second.x + second.width &&
	second.x < first.x + first.width &&
	first.y < second.y + second.height &&
	second.y < first.y + first.height;
