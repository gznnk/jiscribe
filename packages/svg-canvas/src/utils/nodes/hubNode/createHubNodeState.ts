import { HubNodeDefaultState } from "../../../constants/state/nodes/HubNodeDefaultState";
import type { HubNodeState } from "../../../types/state/nodes/HubNodeState";
import { newId } from "../../shapes/common/newId";
import { createEllipseConnectPoint } from "../../shapes/ellipse/createEllipseConnectPoint";

export const createHubNodeState = ({ x, y }: { x: number; y: number }) => {
	const width = HubNodeDefaultState.width;
	const height = HubNodeDefaultState.height;
	const connectPoints = createEllipseConnectPoint({
		cx: x + width / 2,
		cy: y + height / 2,
		rx: width / 2,
		ry: height / 2,
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
