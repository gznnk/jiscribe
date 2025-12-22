import type { Box } from "../../../types/core/Box";
import type { Diagram } from "../../../types/state/core/Diagram";
import { isFrame } from "../../validation/isFrame";
import { degreesToRadians } from "../common/degreesToRadians";
import { efficientAffineTransformation } from "../transform/efficientAffineTransformation";

/**
 * Calculates the bounding box of a diagram.
 * Returns the box coordinates representing the diagram's outer bounds.
 * Note: x and y represent the center coordinates of the diagram.
 *
 * @param diagram - The diagram to calculate bounding box for
 * @returns The bounding box with top, left, right, bottom coordinates
 */
export const calcDiagramBoundingBox = (diagram: Diagram): Box => {
	const { x, y } = diagram;

	// For non-shape diagrams (points, etc.), return a point box
	if (!isFrame(diagram)) {
		return {
			top: y,
			left: x,
			right: x,
			bottom: y,
		};
	}

	const { width, height, rotation, scaleX, scaleY } = diagram;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// For diagrams with rotation, calculate all four corners and find bounding box
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

		// Find min/max coordinates
		const left = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
		const right = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
		const top = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
		const bottom = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

		return { top, left, right, bottom };
	}

	// For non-rotated transformative diagrams, calculate simple bounding box
	return {
		top: y - halfHeight,
		left: x - halfWidth,
		right: x + halfWidth,
		bottom: y + halfHeight,
	};
};
