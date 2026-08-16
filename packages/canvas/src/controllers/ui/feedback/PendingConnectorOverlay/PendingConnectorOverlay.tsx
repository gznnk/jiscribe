import { memo } from "react";

import { resolveEndpointOwner } from "../../../../domain/state/connector/endpoints";
import { ConnectorRenderer } from "../../../../presentations/layers/content/ConnectorRenderer";
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
