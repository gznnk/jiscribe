import { ImageGenNodeDefaultState } from "../../../constants/state/nodes/ImageGenNodeDefaultState";
import type { ImageGenNodeState } from "../../../types/state/nodes/ImageGenNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for an ImageGen node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @returns ImageGen node state object
 */
export const createImageGenNodeState = ({ x, y }: { x: number; y: number }) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width: ImageGenNodeDefaultState.width,
		height: ImageGenNodeDefaultState.height,
		rotation: ImageGenNodeDefaultState.rotation,
		scaleX: ImageGenNodeDefaultState.scaleX,
		scaleY: ImageGenNodeDefaultState.scaleY,
	});

	return {
		...ImageGenNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as ImageGenNodeState;
};
