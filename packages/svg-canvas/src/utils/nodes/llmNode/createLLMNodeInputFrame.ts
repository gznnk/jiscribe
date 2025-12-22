import {
	BASE_MARGIN,
	HEADER_HEIGHT,
	HEADER_MARGIN_BOTTOM,
	HEADER_MARGIN_TOP,
} from "../../../constants/styling/nodes/NodeStyling";
import type { Frame } from "../../../types/core/Frame";
import { degreesToRadians } from "../../math/common/degreesToRadians";
import { calculateEffectiveDimensions } from "../../math/geometry/calculateEffectiveDimensions";
import { efficientAffineTransformation } from "../../math/transform/efficientAffineTransformation";

/**
 * Creates a Frame state for LLMNode Input component containing x, y, width, height, rotation, scaleX, and scaleY.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @param width - Width of the node
 * @param height - Height of the node
 * @param minWidth - Minimum width constraint (optional)
 * @param minHeight - Minimum height constraint (optional)
 * @param rotation - Rotation of the node in degrees
 * @param scaleX - X scale of the node
 * @param scaleY - Y scale of the node
 * @returns Frame object with input dimensions and center position
 */
export const createLLMNodeInputFrame = ({
	x,
	y,
	width,
	height,
	minWidth,
	minHeight,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
}: {
	x: number;
	y: number;
	width: number;
	height: number;
	minWidth?: number;
	minHeight?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
}): Frame => {
	// Calculate effective dimensions using minimums if provided
	const { effectiveWidth, effectiveHeight } = calculateEffectiveDimensions(
		width,
		height,
		minWidth,
		minHeight,
	);

	// Calculate input dimensions
	const inputHeight =
		effectiveHeight -
		(HEADER_MARGIN_TOP + HEADER_HEIGHT + HEADER_MARGIN_BOTTOM + BASE_MARGIN);
	const inputWidth = effectiveWidth - BASE_MARGIN * 2;

	// Calculate center position with affine transformation
	const inputCenter = efficientAffineTransformation(
		0,
		-(
			effectiveHeight / 2 -
			(inputHeight / 2 +
				HEADER_MARGIN_TOP +
				HEADER_HEIGHT +
				HEADER_MARGIN_BOTTOM)
		),
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return {
		x: inputCenter.x,
		y: inputCenter.y,
		width: inputWidth,
		height: inputHeight,
		rotation,
		scaleX,
		scaleY,
	};
};
