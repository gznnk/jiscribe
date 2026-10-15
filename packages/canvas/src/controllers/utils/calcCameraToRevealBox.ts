import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

import type { Viewport } from "../../rendering/Viewport";
import type { Camera } from "../CanvasTypes";

/**
 * Margin kept around something small the view follows as the user moves it — a
 * text caret, a picked part — in screen px.
 */
export const FOCUS_REVEAL_PADDING = 24;

/**
 * What to show of a box longer than the visible span on an axis: the edge the
 * pan reaches first, or — unless some of the box is already in view — its
 * middle with both ends cut off evenly.
 */
export type OversizedBoxPlacement = "leadingEdge" | "centerUnlessVisible";

/**
 * Start of the visible span on one axis after the smallest pan that reveals
 * `[boxMin, boxMax]` with `padding` on both ends. Every value is in world units
 * on that axis.
 */
const calcRevealedAxisMin = (
	visibleMin: number,
	visibleSize: number,
	unpaddedBoxMin: number,
	unpaddedBoxMax: number,
	padding: number,
	oversizedPlacement: OversizedBoxPlacement,
): number => {
	const boxMin = unpaddedBoxMin - padding;
	const boxMax = unpaddedBoxMax + padding;
	if (
		oversizedPlacement === "centerUnlessVisible" &&
		boxMax - boxMin > visibleSize
	) {
		// Judged on the box itself: the padding is a margin, not content.
		const isPartlyVisible =
			unpaddedBoxMax > visibleMin && unpaddedBoxMin < visibleMin + visibleSize;
		return isPartlyVisible ? visibleMin : (boxMin + boxMax - visibleSize) / 2;
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
 * Pan only: `zoom` is carried over untouched. Each axis is handled on its own,
 * taking the smallest pan that brings the box inside.
 *
 * @param viewport - Current viewport. `width` / `height` are screen px, so the
 *   visible world rect is `width / zoom` × `height / zoom`; a viewport not yet
 *   measured (either side 0 or less) yields null
 * @param worldBox - Box to reveal, in world coordinates (already axis aligned,
 *   so a rotated shape must be passed as its AABB). One longer than the visible
 *   span (padding included) cannot be shown whole; `oversizedPlacement` decides
 *   which part of it is
 * @param screenPadding - Empty margin kept between the box and each viewport
 *   edge, in screen px (converted to world units by dividing by `zoom`, so it
 *   stays the same size on screen at any zoom). Defaults to 0
 * @param oversizedPlacement - Per axis, for a padded box longer than the
 *   visible span: `"leadingEdge"` (the default) takes the smallest pan, which
 *   lands on the edge it reaches first and leaves the view alone while the
 *   view already lies inside the box; `"centerUnlessVisible"` leaves the view
 *   alone while any of the box (padding aside) is on screen, and otherwise
 *   centres the view on it
 * @returns The camera to move to, or null when the padded box is already inside
 *   the visible rect and nothing has to move
 */
export const calcCameraToRevealBox = (
	viewport: Viewport,
	worldBox: BoundingBox,
	screenPadding = 0,
	oversizedPlacement: OversizedBoxPlacement = "leadingEdge",
): Camera | null => {
	const { minX, minY, width, height, zoom } = viewport;
	if (width <= 0 || height <= 0) {
		return null;
	}

	const worldPadding = screenPadding / zoom;

	const revealedMinX = calcRevealedAxisMin(
		minX,
		width / zoom,
		worldBox.left,
		worldBox.right,
		worldPadding,
		oversizedPlacement,
	);
	const revealedMinY = calcRevealedAxisMin(
		minY,
		height / zoom,
		worldBox.top,
		worldBox.bottom,
		worldPadding,
		oversizedPlacement,
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
