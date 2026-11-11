import type { Rect } from "@jiscribe/geometry";

/**
 * Whether `inner` lies wholly within `outer`, edges included: a box sharing a side with
 * `outer`, or equal to it, counts as inside.
 *
 * @param outer - The box tested as the container, in the same coordinate space as `inner`
 * @param inner - The box tested as the content; a zero-size box on `outer`'s edge counts
 *   as inside
 */
export const isRectInside = (outer: Rect, inner: Rect): boolean =>
	inner.x >= outer.x &&
	inner.y >= outer.y &&
	inner.x + inner.width <= outer.x + outer.width &&
	inner.y + inner.height <= outer.y + outer.height;
