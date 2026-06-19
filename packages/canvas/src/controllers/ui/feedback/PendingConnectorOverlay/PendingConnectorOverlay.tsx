import { memo } from "react";

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
			objects={objects}
			disablePointerEvents={true}
		/>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
