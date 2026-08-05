import type { Point } from "@workspace/geometry";

import {
	SHIELD_FLANK_CONTROL_Y_RATIO,
	SHIELD_SHOULDER_RATIO,
	SHIELD_TIP_CONTROL_X_RATIO,
	SHIELD_TIP_CONTROL_Y_RATIO,
} from "../../schema/shield/ShieldDoc";

/**
 * A cubic segment as the four points an SVG `C` command and
 * {@link import("@workspace/geometry").sampleCubicBezier} both take: start, two
 * controls, end.
 */
export type ShieldCurveSegment = [Point, Point, Point, Point];

export type ShieldCurve = {
	/** Where the straight flanks end and the curve to the tip begins. */
	shoulderY: number;
	/** Right flank, from the right shoulder down to the tip. */
	rightFlank: ShieldCurveSegment;
	/** Left flank, from the tip back up to the left shoulder. */
	leftFlank: ShieldCurveSegment;
};

/**
 * Lays out the shield's lower curve for a bounding box whose top-left corner is
 * at (x, y): a flat top edge, straight sides down to the shoulders, then two
 * mirrored cubics meeting at a tip on the bottom center. Shared by the renderer
 * (centered origin) and the outline, which samples the very same segments — so
 * the drawn shape and the one connectors attach to cannot drift apart.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width.
 * @param height Box height; the tip reaches its bottom edge.
 */
export const calcShieldCurve = (
	x: number,
	y: number,
	width: number,
	height: number,
): ShieldCurve => {
	const centerX = x + width / 2;
	const shoulderY = y + height * SHIELD_SHOULDER_RATIO;
	const flankControlY = y + height * SHIELD_FLANK_CONTROL_Y_RATIO;
	const tipControlY = y + height * SHIELD_TIP_CONTROL_Y_RATIO;
	const tipControlOffsetX = width * SHIELD_TIP_CONTROL_X_RATIO;
	const tip = { x: centerX, y: y + height };
	return {
		shoulderY,
		rightFlank: [
			{ x: x + width, y: shoulderY },
			{ x: x + width, y: flankControlY },
			{ x: centerX + tipControlOffsetX, y: tipControlY },
			tip,
		],
		leftFlank: [
			tip,
			{ x: centerX - tipControlOffsetX, y: tipControlY },
			{ x, y: flankControlY },
			{ x, y: shoulderY },
		],
	};
};
