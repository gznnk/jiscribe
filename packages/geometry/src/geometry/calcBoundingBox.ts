import { degreesToRadians } from "../common/degreesToRadians";
import { efficientAffineTransformation } from "../transform/efficientAffineTransformation";
import type { Box } from "../types/Box";
import type { Frame } from "../types/Frame";
import type { Point } from "../types/Point";

const isFrame = (element: Point | Frame): element is Frame => {
	return "width" in element && "height" in element;
};

/**
 * Calculates the bounding box of a geometric element (Point or Frame).
 * Returns the box coordinates representing the element's outer bounds.
 * Note: x and y represent the center coordinates of the element.
 *
 * @param element - The element to calculate bounding box for
 * @returns The bounding box with top, left, right, bottom coordinates
 */
export const calcBoundingBox = (element: Point | Frame): Box => {
	const { x, y } = element;

	// For non-shape elements (points, etc.), return a point box
	if (!isFrame(element)) {
		return {
			top: y,
			left: x,
			right: x,
			bottom: y,
		};
	}

	const {
		width,
		height,
		rotation = 0,
		scaleX = 1,
		scaleY = 1,
	} = element as Frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// For elements with rotation, calculate all four corners and find bounding box
	if (rotation !== 0) {
		const radians = degreesToRadians(rotation);

		// Calculate all four corners
		const topLeft = efficientAffineTransformation(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const bottomLeft = efficientAffineTransformation(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const topRight = efficientAffineTransformation(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const bottomRight = efficientAffineTransformation(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		// Find min/max values
		const left = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const right = Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const top = Math.min(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);
		const bottom = Math.max(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);

		return { top, left, right, bottom };
	}

	// Optimized path for non-rotated elements
	// Calculate scaled dimensions
	const scaledHalfWidth = halfWidth * scaleX;
	const scaledHalfHeight = halfHeight * scaleY;

	return {
		top: y - scaledHalfHeight,
		left: x - scaledHalfWidth,
		right: x + scaledHalfWidth,
		bottom: y + scaledHalfHeight,
	};
};
