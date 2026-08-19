import { memo } from "react";

import { ConnectorRenderer } from "../../../../rendering/layers/content/ConnectorRenderer";
import { resolveEndpointOwner } from "../../../../rendering/layers/content/utils/endpoints";
import type { CanvasControllerState } from "../../../CanvasTypes";

type PendingConnectorOverlayProps = Pick<
	CanvasControllerState,
	"pendingConnector" | "objects"
>;

const PendingConnectorOverlayComponent: React.FC<
	PendingConnectorOverlayProps
> = ({ pendingConnector, objects }) => {
	if (!pendingConnector) {
		return null;
	}

	return (
		<ConnectorRenderer
			connectorState={pendingConnector}
			sourceObj={resolveEndpointOwner(objects, pendingConnector.source)}
			targetObj={resolveEndpointOwner(objects, pendingConnector.target)}
			disablePointerEvents={true}
		/>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
