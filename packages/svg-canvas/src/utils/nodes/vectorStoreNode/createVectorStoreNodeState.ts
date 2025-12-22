import { VectorStoreNodeDefaultState } from "../../../constants/state/nodes/VectorStoreNodeDefaultState";
import type { VectorStoreNodeState } from "../../../types/state/nodes/VectorStoreNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for a VectorStore node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @returns VectorStore node state object
 */
export const createVectorStoreNodeState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width: VectorStoreNodeDefaultState.width,
		height: VectorStoreNodeDefaultState.height,
		rotation: VectorStoreNodeDefaultState.rotation,
		scaleX: VectorStoreNodeDefaultState.scaleX,
		scaleY: VectorStoreNodeDefaultState.scaleY,
	});

	return {
		...VectorStoreNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as VectorStoreNodeState;
};
