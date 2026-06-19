import { memo } from "react";

import { useResolvedConnectorPoints } from "../../../../presentations/layers/content/utils/useResolvedConnectorPoints";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

const ENDPOINT_RADIUS = 4;
const ENDPOINT_STROKE_WIDTH = 1;
const ENDPOINT_COLOR = "#0d99ff";
const ENDPOINT_FILL = "white";

type ConnectorControlsProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	zoom?: number;
};

/**
 * Renders the selection outline and endpoint handles for a selected connector.
 * Placed in the controllers layer so selection visuals are decoupled from the connector itself.
 *
 * Endpoint handles allow reconnection via drag:
 * - data-kind="control" for GestureHandler routing
 * - data-id="connection-anchor:edit:<id>:source|target" for identifying which endpoint
 */
const ConnectorControlsComponent: React.FC<ConnectorControlsProps> = ({
	connectorState,
	objects,
	zoom = 1,
}) => {
	const points = useResolvedConnectorPoints(connectorState, objects);

	if (!points) {
		return null;
	}

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedEndpointRadius = ENDPOINT_RADIUS / zoom;
	const adjustedEndpointStrokeWidth = ENDPOINT_STROKE_WIDTH / zoom;

	// Always show handles for both endpoints
	// Users can drag to reconnect (Owned -> Owned/Free) or adjust position (Free -> Free/Owned)
	const showSourceHandle = true;
	const showTargetHandle = true;

	return (
		<g data-layer="connector-controls">
			{/* Source endpoint handle (interactive) - only for FreeAnchor */}
			{showSourceHandle && (
				<circle
					cx={points.source.x}
					cy={points.source.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={`connection-anchor:edit:${connectorState.id}:source`}
					style={{ cursor: "move" }}
				/>
			)}

			{/* Target endpoint handle (interactive) - only for FreeAnchor */}
			{showTargetHandle && (
				<circle
					cx={points.target.x}
					cy={points.target.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={`connection-anchor:edit:${connectorState.id}:target`}
					style={{ cursor: "move" }}
				/>
			)}
		</g>
	);
};

export const ConnectorControls = memo(ConnectorControlsComponent);
