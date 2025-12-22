import { ButtonDefaultState } from "../../../constants/state/elements/ButtonDefaultState";
import type { ButtonState } from "../../../types/state/elements/ButtonState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Create Button state
 */
export const createButtonState = ({
	x,
	y,
	width = ButtonDefaultState.width,
	height = ButtonDefaultState.height,
	rotation = ButtonDefaultState.rotation,
	scaleX = ButtonDefaultState.scaleX,
	scaleY = ButtonDefaultState.scaleY,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
}): ButtonState => {
	// Create connect points for the button
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	return {
		...ButtonDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		connectPoints,
	};
};
