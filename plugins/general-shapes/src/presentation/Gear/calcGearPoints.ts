import type { Point } from "@jiscribe/geometry";

import {
	GEAR_ROOT_RADIUS_RATIO,
	GEAR_ROOT_HALF_ANGLE_RATIO,
	GEAR_TIP_HALF_ANGLE_RATIO,
	GEAR_TOOTH_COUNT,
} from "../../schema/gear/GearDoc";

/**
 * Corners of the gear's rim for a bounding box whose top-left corner is at
 * (x, y): four per tooth — the two ends of its tip, then the two ends of the gap
 * that follows. Teeth ride the box's inscribed ellipse, so a stretched box gives
 * a stretched gear.
 *
 * The corners come out strictly increasing in angle around the center, which
 * makes the polygon star-shaped about it: a ray from the center crosses it
 * exactly once, so a connector's endpoint moves continuously as its far end is
 * dragged. Shared by the renderer (centered origin) and the outline.
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width.
 * @param height Box height.
 * @returns `GEAR_TOOTH_COUNT * 4` corners, clockwise from the first tooth's leading tip.
 */
export const calcGearPoints = (
	x: number,
	y: number,
	width: number,
	height: number,
): Point[] => {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	const radiusX = width / 2;
	const radiusY = height / 2;
	const pitch = (Math.PI * 2) / GEAR_TOOTH_COUNT;
	const tipHalfAngle = pitch * GEAR_TIP_HALF_ANGLE_RATIO;
	const rootHalfAngle = pitch * GEAR_ROOT_HALF_ANGLE_RATIO;

	const rimPoint = (radiusRatio: number, angle: number): Point => ({
		x: centerX + radiusX * radiusRatio * Math.cos(angle),
		y: centerY + radiusY * radiusRatio * Math.sin(angle),
	});

	return Array.from({ length: GEAR_TOOTH_COUNT }, (_, index) => {
		const angle = index * pitch;
		return [
			rimPoint(1, angle - tipHalfAngle),
			rimPoint(1, angle + tipHalfAngle),
			rimPoint(GEAR_ROOT_RADIUS_RATIO, angle + rootHalfAngle),
			rimPoint(GEAR_ROOT_RADIUS_RATIO, angle + pitch - rootHalfAngle),
		];
	}).flat();
};
