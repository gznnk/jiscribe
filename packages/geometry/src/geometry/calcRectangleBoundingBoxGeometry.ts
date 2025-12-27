import { calcRectangleVertices } from "./calcRectangleVertices";
import type { BoxGeometry } from "../types/BoxGeometry";
import type { Frame } from "../types/Frame";

// TODO: この関数は calcBoundingBox と似ているので、統合を検討すること
/**
 * Calculates the bounding box geometry of a rectangle.
 * Takes into account rotation and scaling.
 *
 * @param shape - Rectangle shape parameters
 * @returns The bounding box geometry
 */
export const calcRectangleBoundingBoxGeometry = (frame: Frame): BoxGeometry => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	const rectGeometry = {
		x: cx - width / 2,
		y: cy - height / 2,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	};
	const { topLeftPoint, bottomLeftPoint, topRightPoint, bottomRightPoint } =
		calcRectangleVertices(rectGeometry);

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
