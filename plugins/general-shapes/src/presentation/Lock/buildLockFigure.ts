import {
	LOCK_BODY_CORNER_RATIO,
	LOCK_BODY_TOP_RATIO,
	LOCK_BODY_X_RATIO,
	LOCK_SHACKLE_ARCH_RATIO,
	LOCK_SHACKLE_HALF_WIDTH_RATIO,
	LOCK_SHACKLE_SHOULDER_RATIO,
} from "../../schema/lock/LockDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildEllipsePath,
	buildRoundedRectPath,
	buildVerticalLinePath,
} from "../shared/pictogramPaths";

/** The keyhole, as fractions of the body block. */
const LOCK_KEYHOLE_Y_RATIO = 0.4;
const LOCK_KEYHOLE_RADIUS_RATIO = 0.07;
const LOCK_KEYHOLE_SLOT_END_RATIO = 0.68;

/**
 * Lays out a padlock over the bounding box whose top-left corner is at (x, y).
 * Only the body block is a silhouette: the shackle is an open arc and would
 * enclose nothing if filled, so it and the keyhole are detail.
 *
 * The shackle therefore paints nothing that can be hit, which would leave the
 * upper part of the box unable to receive a connector at all (PictogramFigure.hit).
 * It gets a hit path of its own: the same arc, closed across the bottom.
 *
 * Shared by the object renderer (centered origin), the draw-drag preview that
 * reuses it, and the stencil icon.
 */
export const buildLockFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const centerX = x + width / 2;
	const bodyTop = y + height * LOCK_BODY_TOP_RATIO;
	const bodyHeight = height * (1 - LOCK_BODY_TOP_RATIO);
	const shackleHalfWidth = width * LOCK_SHACKLE_HALF_WIDTH_RATIO;
	const shoulderY = y + height * LOCK_SHACKLE_SHOULDER_RATIO;
	const keyholeY = bodyTop + bodyHeight * LOCK_KEYHOLE_Y_RATIO;
	const keyholeRadius = Math.min(width, height) * LOCK_KEYHOLE_RADIUS_RATIO;
	const shacklePath =
		`M ${centerX - shackleHalfWidth} ${bodyTop} V ${shoulderY} ` +
		`A ${shackleHalfWidth} ${height * LOCK_SHACKLE_ARCH_RATIO} 0 0 1 ${centerX + shackleHalfWidth} ${shoulderY} ` +
		`V ${bodyTop}`;

	return {
		body: [
			buildRoundedRectPath(
				x + width * LOCK_BODY_X_RATIO,
				bodyTop,
				width * (1 - LOCK_BODY_X_RATIO * 2),
				bodyHeight,
				Math.min(width, height) * LOCK_BODY_CORNER_RATIO,
			),
		],
		hit: [`${shacklePath} Z`],
		detail: [
			shacklePath,
			buildEllipsePath(centerX, keyholeY, keyholeRadius, keyholeRadius),
			buildVerticalLinePath(
				centerX,
				keyholeY,
				bodyTop + bodyHeight * LOCK_KEYHOLE_SLOT_END_RATIO,
			),
		],
	};
};
