import { memo } from "react";

import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ConnectorControls } from "../ConnectorControls";

type ConnectorControlsLayerProps = Pick<
	CanvasControllerState,
	"selectedConnectorId" | "objects"
> & {
	zoom?: number;
};

/**
 * Layer that renders controls for the currently selected connector.
 * Placed alongside other control layers (TransformControlsLayer, VertexControlsLayer, etc.)
 * in Canvas.tsx, so it receives state directly from the controller.
 */
const ConnectorControlsLayerComponent: React.FC<
	ConnectorControlsLayerProps
> = ({ selectedConnectorId, objects, zoom }) => {
	if (!selectedConnectorId) {
		return null;
	}

	const connectorState = objects[selectedConnectorId];
	if (!connectorState || connectorState.type !== "connector") {
		return null;
	}

	return (
		<ConnectorControls
			connectorState={connectorState as ConnectorState}
			objects={objects}
			zoom={zoom}
		/>
	);
};

export const ConnectorControlsLayer = memo(ConnectorControlsLayerComponent);
