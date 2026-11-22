import type { Point } from "@jiscribe/geometry";

import {
	LIGHTNING_INNER_X_RATIO,
	LIGHTNING_STEP_TOP_RATIO,
	LIGHTNING_TIP_X_RATIO,
} from "./LightningDoc";

/**
 * Corners of the lightning bolt for a bounding box whose top-left corner is at
 * (x, y): from the upper tip on the top edge down the right side to the lower
 * tip on the bottom edge, then back up the left side. The bolt reaches all four
 * edges — the tips the top and bottom, the step's outer ends the sides.
 *
 * The corners come out strictly increasing in angle around the box center, which
 * makes the polygon star-shaped about it: a ray from the center crosses it
 * exactly once, so a connector's endpoint moves continuously as its far end is
 * dragged. Scaling the box keeps that, since the ratios are applied per axis.
 * Shared by the renderer (centered origin) and the outline.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width, spanned by the step's two outer ends (on x and x + width); 0 collapses all six corners onto x.
 * @param height Box height, spanned by the two tips (on y and y + height); 0 collapses all six corners onto y.
 * @returns Six corners, clockwise from the upper tip.
 */
export const calcLightningPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const at = (xRatio: number, yRatio: number): Point => ({
		x: x + width * xRatio,
		y: y + height * yRatio,
	});

	return [
		at(LIGHTNING_TIP_X_RATIO, 0),
		at(1 - LIGHTNING_INNER_X_RATIO, LIGHTNING_STEP_TOP_RATIO),
		at(1, LIGHTNING_STEP_TOP_RATIO),
		at(1 - LIGHTNING_TIP_X_RATIO, 1),
		at(LIGHTNING_INNER_X_RATIO, 1 - LIGHTNING_STEP_TOP_RATIO),
		at(0, 1 - LIGHTNING_STEP_TOP_RATIO),
	];
};
