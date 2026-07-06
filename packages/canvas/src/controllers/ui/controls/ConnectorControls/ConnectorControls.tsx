import { memo } from "react";

import { useResolvedConnectorPoints } from "../../../../presentations/layers/content/hooks/useResolvedConnectorPoints";
import { isOrthogonalRouting } from "../../../../schemas/objects/types/ConnectorRouting";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { VertexControls, VertexInsertControls } from "../VertexControls";

const ENDPOINT_RADIUS = 4;
const ENDPOINT_STROKE_WIDTH = 1;
const ENDPOINT_COLOR = "#0d99ff";
const ENDPOINT_FILL = "white";

type ConnectorControlsProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
	zoom?: number;
	selectedVertex?: CanvasControllerState["selectedVertex"];
};

/**
 * Renders the editing controls for a selected connector:
 * - Endpoint handles (source / target): drag to reconnect to a shape
 *   (data-id=<id> + data-part="endpoint:source|target" → ConnectionAnchorEventHandler)
 * - Waypoint move handles: move existing waypoints
 *   (data-id=<id> + data-part="vertex:<i>" → reuses VertexControlHandler)
 * - Waypoint insert handles: the midpoint of each segment of the resolved path [source, ...waypoints, target].
 *   Drag to add a new waypoint
 *   (data-id=<id> + data-part="waypoint-insert:<segment>" → ConnectorVertexInsertHandler)
 *
 * Placed in the controllers layer so selection visuals are decoupled from the connector itself.
 */
const ConnectorControlsComponent: React.FC<ConnectorControlsProps> = ({
	connectorState,
	objects,
	zoom = 1,
	selectedVertex = null,
}) => {
	const resolved = useResolvedConnectorPoints(connectorState, objects);

	if (!resolved) {
		return null;
	}

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedEndpointRadius = ENDPOINT_RADIUS / zoom;
	const adjustedEndpointStrokeWidth = ENDPOINT_STROKE_WIDTH / zoom;

	// Enforce the connector invariant "at least one endpoint is owned" on the UI side.
	// When one endpoint is free, hide the handle of the paired owned endpoint.
	// Otherwise the owned endpoint could be dragged into empty space (free), creating a free-free connector.
	// The free endpoint's handle is always shown (for repositioning and reconnecting to a shape).
	const sourceIsFree = !connectorState.source.owner;
	const targetIsFree = !connectorState.target.owner;
	const showSourceHandle = sourceIsFree || !targetIsFree;
	const showTargetHandle = targetIsFree || !sourceIsFree;

	// Move handles are placed at the waypoints; insert handles are placed at the midpoint of each
	// segment of the fully resolved path (endpoints included).
	// For orthogonal (automatic routing) the path is computed, so no manual handles are shown.
	// When routing is omitted, orthogonal is the default.
	const isOrthogonal = isOrthogonalRouting(connectorState.routing);
	const waypoints = connectorState.points;
	const selectedVertexIndex =
		selectedVertex?.objectId === connectorState.id
			? selectedVertex.vertexIndex
			: null;

	return (
		<g data-layer="connector-controls">
			{/* Waypoint insert handles (segment midpoints of the endpoint-inclusive path). Drawn beneath the endpoint handles */}
			{!isOrthogonal && (
				<VertexInsertControls
					objectId={connectorState.id}
					points={resolved.points}
					insertPartSubtype="waypoint-insert"
					zoom={zoom}
				/>
			)}

			{/* Waypoint move handles */}
			{!isOrthogonal && (
				<VertexControls
					objectId={connectorState.id}
					points={waypoints}
					zoom={zoom}
					selectedVertexIndex={selectedVertexIndex}
				/>
			)}

			{/* Source endpoint handle (interactive). Hidden for the owned endpoint when its pair is free */}
			{showSourceHandle && (
				<circle
					cx={resolved.source.x}
					cy={resolved.source.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={connectorState.id}
					data-part="endpoint:source"
					style={{ cursor: "move" }}
				/>
			)}

			{/* Target endpoint handle (interactive). Hidden for the owned endpoint when its pair is free */}
			{showTargetHandle && (
				<circle
					cx={resolved.target.x}
					cy={resolved.target.y}
					r={adjustedEndpointRadius}
					fill={ENDPOINT_FILL}
					stroke={ENDPOINT_COLOR}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={connectorState.id}
					data-part="endpoint:target"
					style={{ cursor: "move" }}
				/>
			)}
		</g>
	);
};

export const ConnectorControls = memo(ConnectorControlsComponent);
