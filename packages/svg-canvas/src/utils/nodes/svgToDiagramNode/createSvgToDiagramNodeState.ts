import { SvgToDiagramNodeDefaultState } from "../../../constants/state/nodes/SvgToDiagramNodeDefaultState";
import type { SvgToDiagramNodeState } from "../../../types/state/nodes/SvgToDiagramNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

/**
 * Creates state for a SvgToDiagram node with specified properties.
 *
 * @param x - The x coordinate of the node
 * @param y - The y coordinate of the node
 * @returns SvgToDiagram node state object
 */
export const createSvgToDiagramNodeState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width: SvgToDiagramNodeDefaultState.width,
		height: SvgToDiagramNodeDefaultState.height,
		rotation: SvgToDiagramNodeDefaultState.rotation,
		scaleX: SvgToDiagramNodeDefaultState.scaleX,
		scaleY: SvgToDiagramNodeDefaultState.scaleY,
	});

	return {
		...SvgToDiagramNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as SvgToDiagramNodeState;
};
