import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal, type BoundingBox } from "@jiscribe/geometry";

import type { Camera, Viewport } from "../../states/canvas/Viewport";

/**
 * `value` clamped between two range ends, whichever way round they are given,
 * with the range widened to reach `anchor`.
 */
const clampBetween = (
	value: number,
	end: number,
	otherEnd: number,
	anchor: number,
): number =>
	Math.min(
		Math.max(value, Math.min(end, otherEnd, anchor)),
		Math.max(end, otherEnd, anchor),
	);

/**
 * The camera a scroll produced, held inside the scrollable rect, keeping the
 * zoom as it is.
 *
 * The visible world rect is kept within `bounds`. When the view is wider (or
 * taller) than the bounds, that range inverts — its ends are then "content flush
 * left" and "content flush right" — and the clamp uses it as given, which is what
 * lets a content smaller than the view be pushed to either edge instead of being
 * pinned at the center.
 *
 * A view that is already outside (a drag scrolled it out there, a host camera
 * jumped it) is never yanked back: the range is widened to where the scroll
 * started, so such a view can only scroll back toward the bounds, never further
 * away. That leaves the correction to the user rather than making the first
 * scroll after a drag jump.
 *
 * @param scrolled - The camera the scroll produced, plus the container-measured
 *   size the visible world rect is derived from (`width / zoom` by `height / zoom`)
 * @param from - The camera the scroll started at; the range is widened to include
 *   it, so a scroll that starts outside the bounds is limited to what it already was
 * @param bounds - The rect the visible world rect must stay inside, in world
 *   coordinates; null (the infinite canvas, or a doc with no content) returns the
 *   camera untouched
 * @returns The clamped camera, rounded to PRECISION.COORDINATE so it matches what
 *   the viewport-moving handlers round to
 */
export const clampScrolledCamera = (
	scrolled: Viewport,
	from: Camera,
	bounds: BoundingBox | null,
): Camera => {
	const { minX, minY, zoom } = scrolled;
	if (bounds === null) {
		return { minX, minY, zoom };
	}

	const worldWidth = scrolled.width / zoom;
	const worldHeight = scrolled.height / zoom;

	return {
		minX: roundToDecimal(
			clampBetween(minX, bounds.left, bounds.right - worldWidth, from.minX),
			PRECISION.COORDINATE,
		),
		minY: roundToDecimal(
			clampBetween(minY, bounds.top, bounds.bottom - worldHeight, from.minY),
			PRECISION.COORDINATE,
		),
		zoom,
	};
};
