import { roundToDecimal } from "@workspace/geometry";
import type { BoundingBox } from "@workspace/geometry";

import { PRECISION } from "../../constants/precision";
import type { Camera, Viewport } from "../../states/canvas/Viewport";

/**
 * Start of the visible span on one axis after the smallest pan that reveals
 * `[boxMin, boxMax]`. Every value is in world units on that axis.
 */
const calcRevealedAxisMin = (
	visibleMin: number,
	visibleSize: number,
	boxMin: number,
	boxMax: number,
): number => {
	// A box longer than the visible span cannot be shown whole, so "reveal" degrades
	// to "keep some of it in view". Staying put whenever the span is already inside
	// the box is what stops a shape larger than the viewport from yanking the camera
	// to its far corner the moment its label is edited. The cost is that a line
	// longer than the span stops being followed once the view sits inside it; only
	// tracking the caret rather than the box would fix that.
	if (boxMax - boxMin >= visibleSize) {
		if (visibleMin >= boxMin && visibleMin + visibleSize <= boxMax) {
			return visibleMin;
		}
		return visibleMin < boxMin ? boxMin : boxMax - visibleSize;
	}
	if (boxMin < visibleMin) {
		return boxMin;
	}
	if (boxMax > visibleMin + visibleSize) {
		return boxMax - visibleSize;
	}
	return visibleMin;
};

/**
 * Smallest pan that brings a world-coordinate box inside the viewport's visible
 * rect, expressed as the camera to move to.
 *
 * Pan only: `zoom` is carried over untouched. Each axis is handled on its own: a
 * box that fits gets the smallest pan that brings it inside, and a box longer
 * than the visible span is left alone while the span sits within it, otherwise
 * pulled to its nearer end.
 *
 * @param viewport - Current viewport. `width` / `height` are screen px, so the
 *   visible world rect is `width / zoom` × `height / zoom`; a viewport not yet
 *   measured (either side 0 or less) yields null
 * @param worldBox - Box to reveal, in world coordinates (already axis aligned,
 *   so a rotated shape must be passed as its AABB)
 * @param screenPadding - Empty margin kept between the box and each viewport
 *   edge, in screen px (converted to world units by dividing by `zoom`, so it
 *   stays the same size on screen at any zoom). Defaults to 0
 * @returns The camera to move to, or null when the padded box is already inside
 *   the visible rect and nothing has to move
 */
export const calcCameraToRevealBox = (
	viewport: Viewport,
	worldBox: BoundingBox,
	screenPadding = 0,
): Camera | null => {
	const { minX, minY, width, height, zoom } = viewport;
	if (width <= 0 || height <= 0) {
		return null;
	}

	const worldPadding = screenPadding / zoom;

	const revealedMinX = calcRevealedAxisMin(
		minX,
		width / zoom,
		worldBox.left - worldPadding,
		worldBox.right + worldPadding,
	);
	const revealedMinY = calcRevealedAxisMin(
		minY,
		height / zoom,
		worldBox.top - worldPadding,
		worldBox.bottom + worldPadding,
	);

	if (revealedMinX === minX && revealedMinY === minY) {
		return null;
	}

	return {
		minX: roundToDecimal(revealedMinX, PRECISION.COORDINATE),
		minY: roundToDecimal(revealedMinY, PRECISION.COORDINATE),
		zoom,
	};
};
