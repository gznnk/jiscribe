import { memo } from "react";

import { ConnectorRenderer } from "../../../../presentations/layers/content/ConnectorRenderer";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

type PendingConnectorOverlayProps = Pick<
	CanvasState,
	"pendingConnector" | "objects"
>;

const PendingConnectorOverlayComponent: React.FC<
	PendingConnectorOverlayProps
> = ({ pendingConnector, objects }) => {
	if (!pendingConnector) return null;

	return (
		<ConnectorRenderer
			connectorState={pendingConnector}
			objects={objects}
			disablePointerEvents={true}
		/>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
