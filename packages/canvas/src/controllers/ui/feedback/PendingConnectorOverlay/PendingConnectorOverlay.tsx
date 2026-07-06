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

	const sourceObjId = pendingConnector.source.owner?.id;
	const targetObjId = pendingConnector.target.owner?.id;
	return (
		<ConnectorRenderer
			connectorState={pendingConnector}
			sourceObj={sourceObjId ? (objects[sourceObjId] ?? null) : null}
			targetObj={targetObjId ? (objects[targetObjId] ?? null) : null}
			disablePointerEvents={true}
		/>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
