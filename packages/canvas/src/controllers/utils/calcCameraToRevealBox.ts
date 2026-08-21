import { PRECISION } from "@jiscribe/doc/model/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

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
 * Pan only: `zoom` is carried over untouched. Each axis is handled on its own,
 * taking the smallest pan that brings the box inside.
 *
 * @param viewport - Current viewport. `width` / `height` are screen px, so the
 *   visible world rect is `width / zoom` × `height / zoom`; a viewport not yet
 *   measured (either side 0 or less) yields null
 * @param worldBox - Box to reveal, in world coordinates (already axis aligned,
 *   so a rotated shape must be passed as its AABB). One longer than the visible
 *   span cannot be shown whole: its leading edge wins, and the far end stays out
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
