import { AgentNodeDefaultState } from "../../../constants/state/nodes/AgentNodeDefaultState";
import type { AgentNodeState } from "../../../types/state/nodes/AgentNodeState";
import { newId } from "../../shapes/common/newId";
import { createRectangleConnectPoint } from "../../shapes/rectangle/createRectangleConnectPoint";

export const createAgentNodeState = ({ x, y }: { x: number; y: number }) => {
	const connectPoints = createRectangleConnectPoint({
		x,
		y,
		width: AgentNodeDefaultState.width,
		height: AgentNodeDefaultState.height,
		rotation: AgentNodeDefaultState.rotation,
		scaleX: AgentNodeDefaultState.scaleX,
		scaleY: AgentNodeDefaultState.scaleY,
	});

	return {
		...AgentNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as AgentNodeState;
};
