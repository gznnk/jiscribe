import { memo } from "react";

import { useResolvedConnectorPoints } from "../../../../presentations/layers/content/utils/useResolvedConnectorPoints";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";

const SELECTION_COLOR = "#0d99ff";
const SELECTION_STROKE_WIDTH = 1.5;

type ConnectorControlsProps = {
	connectorState: ConnectorState;
	objects: CanvasState["objects"];
};

/**
 * Renders the selection outline for a selected connector.
 * Placed in the controllers layer so selection visuals are decoupled from the connector itself.
 *
 * Future extension: reconnection handles (circles at source/target endpoints)
 * should be added here as separate elements with data-kind="control" and
 * data-id="connector-endpoint:<id>:source" / "connector-endpoint:<id>:target".
 */
const ConnectorControlsComponent: React.FC<ConnectorControlsProps> = ({
	connectorState,
	objects,
}) => {
	const points = useResolvedConnectorPoints(connectorState, objects);

	if (!points) return null;

	const pointsAttr = `${points.source.x},${points.source.y} ${points.target.x},${points.target.y}`;

	return (
		<g data-layer="connector-controls" pointerEvents="none">
			{/* Selection outline */}
			<polyline
				points={pointsAttr}
				stroke={SELECTION_COLOR}
				strokeWidth={SELECTION_STROKE_WIDTH}
				fill="none"
				strokeLinecap="round"
			/>
		</g>
	);
};

export const ConnectorControls = memo(ConnectorControlsComponent);
