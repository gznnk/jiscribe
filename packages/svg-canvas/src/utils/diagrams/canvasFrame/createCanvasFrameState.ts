import { CanvasFrameDefaultData } from "../../../constants/data/diagrams/CanvasFrameDefaultData";
import { CanvasFrameDefaultState } from "../../../constants/state/diagrams/CanvasFrameDefaultState";
import type { CanvasFrameState } from "../../../types/state/diagrams/CanvasFrameState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Create CanvasFrame state
 */
export const createCanvasFrameState = ({
	x,
	y,
	width = CanvasFrameDefaultData.width,
	height = CanvasFrameDefaultData.height,
	rotation = 0,
	scaleX = 1,
	scaleY = 1,
	connectEnabled = true,
}: {
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	connectEnabled?: boolean;
}): CanvasFrameState => {
	const connectPoints = connectEnabled
		? createRectangleConnectPoint({
				x,
				y,
				width,
				height,
				rotation,
				scaleX,
				scaleY,
			})
		: [];

	return {
		...CanvasFrameDefaultState,
		id: newId(),
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		connectEnabled,
		connectPoints,
	};
};
