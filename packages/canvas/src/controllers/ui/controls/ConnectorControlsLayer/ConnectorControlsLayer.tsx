import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { memo } from "react";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { getSelectedConnectorId } from "../../../selection/readers/getSelectedConnectorId";
import { ConnectorControls } from "../ConnectorControls";

type ConnectorControlsLayerProps = Pick<
	CanvasControllerState,
	"selection" | "objects"
> & {
	zoom?: number;
	/** The selected connector's label as open in the editor (resolveConnectorLabelDraft); null while none is open. */
	labelDraft: ConnectorLabel | null;
};

/**
 * Layer that renders controls for the currently selected connector.
 * Placed alongside other control layers (TransformControlsLayer, VertexControlsLayer, etc.)
 * in CanvasControlLayers, so it receives state directly from the controller.
 */
const ConnectorControlsLayerComponent: React.FC<
	ConnectorControlsLayerProps
> = ({ selection, objects, zoom, labelDraft }) => {
	const connectorId = getSelectedConnectorId({ selection, objects });
	if (connectorId === null) {
		return null;
	}

	return (
		<ConnectorControls
			connectorState={objects[connectorId] as ConnectorState}
			objects={objects}
			zoom={zoom}
			selection={selection}
			labelDraft={labelDraft}
		/>
	);
};

export const ConnectorControlsLayer = memo(ConnectorControlsLayerComponent);
