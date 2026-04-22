import { useResolvedConnectorPoints } from "./utils/useResolvedConnectorPoints";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import { Connector } from "../../objects/connections/Connector";

type ConnectorRendererProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	disablePointerEvents?: boolean;
};

export const ConnectorRenderer: React.FC<ConnectorRendererProps> = ({
	connectorState,
	objects,
	disablePointerEvents = false,
}) => {
	const points = useResolvedConnectorPoints(connectorState, objects);

	// Skip rendering if endpoints cannot be resolved
	if (!points) return null;

	return (
		<Connector
			id={connectorState.id}
			sourceX={points.source.x}
			sourceY={points.source.y}
			targetX={points.target.x}
			targetY={points.target.y}
			stroke={connectorState.stroke}
			strokeWidth={connectorState.strokeWidth}
			strokeDashType={connectorState.strokeDashType}
			startArrow={connectorState.startArrow}
			endArrow={connectorState.endArrow}
			disablePointerEvents={disablePointerEvents}
		/>
	);
};
