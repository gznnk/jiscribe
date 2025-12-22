import { WebSearchNodeDefaultState } from "../../../constants/state/nodes/WebSearchNodeDefaultState";
import type { WebSearchNodeState } from "../../../types/state/nodes/WebSearchNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for a WebSearch node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @returns WebSearch node state object
 */
export const createWebSearchNodeState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width: WebSearchNodeDefaultState.width,
		height: WebSearchNodeDefaultState.height,
		rotation: WebSearchNodeDefaultState.rotation,
		scaleX: WebSearchNodeDefaultState.scaleX,
		scaleY: WebSearchNodeDefaultState.scaleY,
	});

	return {
		...WebSearchNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as WebSearchNodeState;
};
