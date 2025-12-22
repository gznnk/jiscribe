import type { Point } from "../../../types/core/Point";

/**
 * Rotates a point around a center point by a given angle.
 *
 * @param px - X-coordinate of the point to rotate
 * @param py - Y-coordinate of the point to rotate
 * @param cx - X-coordinate of the rotation center
 * @param cy - Y-coordinate of the rotation center
 * @param theta - Angle of rotation in radians
 * @returns The rotated point
 */
export const rotatePoint = (
	px: number,
	py: number,
	cx: number,
	cy: number,
	theta: number,
): Point => {
	const cosTheta = Math.cos(theta);
	const sinTheta = Math.sin(theta);
	const dx = px - cx;
	const dy = py - cy;

	const x = cx + (dx * cosTheta - dy * sinTheta);
	const y = cy + (dx * sinTheta + dy * cosTheta);

	return { x, y };
};
