import { HubNodeDefaultState } from "../../../constants/state/nodes/HubNodeDefaultState";
import type { HubNodeState } from "../../../types/state/nodes/HubNodeState";
import { newId } from "../../shapes/common/newId";
import { createEllipseConnectPoint } from "../../shapes/ellipse/createEllipseConnectPoint";

export const createHubNodeState = ({ x, y }: { x: number; y: number }) => {
	const connectPoints = createEllipseConnectPoint({
		x,
		y,
		width: HubNodeDefaultState.width,
		height: HubNodeDefaultState.height,
		rotation: HubNodeDefaultState.rotation,
		scaleX: HubNodeDefaultState.scaleX,
		scaleY: HubNodeDefaultState.scaleY,
	});

	return {
		...HubNodeDefaultState,
		id: newId(),
		x,
		y,
		connectPoints,
	} as HubNodeState;
};
