import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Converts an array of Points to a TransformedFrame (center based).
 * The frame will encompass all points.
 * Rotation is fixed to 0, and scale is fixed to 1.
 *
 * @param points - The array of points
 * @returns The corresponding TransformedFrame
 */
export const convertPointsToFrame = (points: Point[]): TransformedFrame => {
	if (points.length === 0) {
		return {
			cx: 0,
			cy: 0,
			width: 0,
			height: 0,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
		};
	}

	let minX = points[0].x;
	let maxX = points[0].x;
	let minY = points[0].y;
	let maxY = points[0].y;

	for (let i = 1; i < points.length; i++) {
		const p = points[i];
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}

	const width = maxX - minX;
	const height = maxY - minY;

	return {
		cx: minX + width / 2,
		cy: minY + height / 2,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	};
};
