import { memo } from "react";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { getSelectedConnectorId } from "../../../utils/getSelectedConnectorId";
import { ConnectorControls } from "../ConnectorControls";

type ConnectorControlsLayerProps = Pick<
	CanvasControllerState,
	"selectedIds" | "objects" | "objectPartSelection"
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
> = ({ selectedIds, objects, zoom, objectPartSelection }) => {
	const connectorId = getSelectedConnectorId({ selectedIds, objects });
	if (connectorId === null) {
		return null;
	}

	return (
		<ConnectorControls
			connectorState={objects[connectorId] as ConnectorState}
			objects={objects}
			zoom={zoom}
			objectPartSelection={objectPartSelection}
		/>
	);
};

export const ConnectorControlsLayer = memo(ConnectorControlsLayerComponent);
