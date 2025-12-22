import { calcRectangleVertices } from "./calcRectangleVertices";
import type { BoxGeometry } from "../../../types/core/BoxGeometry";
import type { Frame } from "../../../types/core/Frame";

/**
 * Calculates the bounding box geometry of a rectangle.
 * Takes into account rotation and scaling.
 *
 * @param shape - Rectangle shape parameters
 * @returns The bounding box geometry
 */
export const calcRectangleBoundingBoxGeometry = (frame: Frame): BoxGeometry => {
	const { topLeftPoint, bottomLeftPoint, topRightPoint, bottomRightPoint } =
		calcRectangleVertices(frame);

	const left = Math.min(
		topLeftPoint.x,
		bottomLeftPoint.x,
		topRightPoint.x,
		bottomRightPoint.x,
	);
	const top = Math.min(
		topLeftPoint.y,
		bottomLeftPoint.y,
		topRightPoint.y,
		bottomRightPoint.y,
	);
	const right = Math.max(
		topLeftPoint.x,
		bottomLeftPoint.x,
		topRightPoint.x,
		bottomRightPoint.x,
	);
	const bottom = Math.max(
		topLeftPoint.y,
		bottomLeftPoint.y,
		topRightPoint.y,
		bottomRightPoint.y,
	);

	return {
		top,
		left,
		right,
		bottom,
		center: {
			x: (left + right) / 2,
			y: (top + bottom) / 2,
		},
		topLeft: {
			x: left,
			y: top,
		},
		bottomLeft: {
			x: left,
			y: bottom,
		},
		topRight: {
			x: right,
			y: top,
		},
		bottomRight: {
			x: right,
			y: bottom,
		},
	};
};
