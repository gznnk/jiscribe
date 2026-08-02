import { memo } from "react";

import { theme } from "../../../../constants/theme";
import { useResolvedConnectorPoints } from "../../../../presentations/layers/content/hooks/useResolvedConnectorPoints";
import { resolveEndpointOwner } from "../../../../presentations/layers/content/utils/endpoints";
import { isConnectorDrawnOrthogonal } from "../../../../schemas/objects/connections/connector/isConnectorDrawnOrthogonal";
import { isFreeEndpointRef } from "../../../../schemas/objects/types/EndpointRef";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import { useCanvasTheme } from "../../../../theme/CanvasThemeContext";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { VertexControls, VertexInsertControls } from "../VertexControls";

// Handle colors may hold var(--jiscribe-*), so they are applied via style
// (fill/stroke) rather than SVG presentation attributes.
const endpointHandleStyle = {
	fill: theme.handleFill,
	stroke: theme.handleAccent,
	cursor: "move",
} as const;

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
 * - Waypoint insert handles (lines drawn straight only): the midpoint of each segment of the resolved path
 *   [source, ...waypoints, target]. Drag to add a new waypoint
 *   (data-id=<id> + data-part="waypoint-insert:<segment>" → ConnectorVertexInsertHandler)
 *
 * The two shapes are edited differently because a point means a different thing in each. Under
 * straight a point is a bend the user places and then moves freely, so it gets a handle; under
 * orthogonal the vertices have to stay axis-aligned and are only ever moved a whole segment at a
 * time, which needs no handle at all.
 *
 * Both routings also let a segment be grabbed along its whole length, but that hit band lives with
 * the connector rather than here (ConnectorSegmentSlideHitAreas / ConnectorSegmentMoveHitAreas), so it
 * works without selecting first. The insert handles sit on top of those bands at the segment
 * midpoints: the middle of a straight segment adds a vertex, the rest of it moves the segment.
 *
 * Placed in the controllers layer so selection visuals are decoupled from the connector itself.
 */
const ConnectorControlsComponent: React.FC<ConnectorControlsProps> = ({
	connectorState,
	objects,
	zoom = 1,
	selectedVertex = null,
}) => {
	const resolved = useResolvedConnectorPoints(
		connectorState,
		resolveEndpointOwner(objects, connectorState.source),
		resolveEndpointOwner(objects, connectorState.target),
	);
	const { handleDimensions } = useCanvasTheme();

	if (!resolved) {
		return null;
	}

	// Adjust sizes based on zoom level to maintain consistent visual size
	const adjustedEndpointRadius = handleDimensions.anchorRadius / zoom;
	const adjustedEndpointStrokeWidth = handleDimensions.anchorStrokeWidth / zoom;

	// Enforce the connector invariant "at least one endpoint is owned" on the UI side.
	// When one endpoint is free, hide the handle of the paired owned endpoint.
	// Otherwise the owned endpoint could be dragged into empty space (free), creating a free-free connector.
	// The free endpoint's handle is always shown (for repositioning and reconnecting to a shape).
	const sourceIsFree = isFreeEndpointRef(connectorState.source);
	const targetIsFree = isFreeEndpointRef(connectorState.target);
	const showSourceHandle = sourceIsFree || !targetIsFree;
	const showTargetHandle = targetIsFree || !sourceIsFree;

	// Straight gets per-vertex move and insert handles; orthogonal makes each segment grabbable
	// along its whole length instead. What decides is how the line is drawn, not the routing field:
	// a self-loop is drawn as a rectangular loop even carrying "straight", and the insert handles
	// index the drawn path, so offering them there would hand out handles nothing answers to.
	const isOrthogonal = isConnectorDrawnOrthogonal(connectorState);
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
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={connectorState.id}
					data-part="endpoint:source"
					style={endpointHandleStyle}
				/>
			)}

			{/* Target endpoint handle (interactive). Hidden for the owned endpoint when its pair is free */}
			{showTargetHandle && (
				<circle
					cx={resolved.target.x}
					cy={resolved.target.y}
					r={adjustedEndpointRadius}
					strokeWidth={adjustedEndpointStrokeWidth}
					data-kind="control"
					data-id={connectorState.id}
					data-part="endpoint:target"
					style={endpointHandleStyle}
				/>
			)}
		</g>
	);
};

export const ConnectorControls = memo(ConnectorControlsComponent);
