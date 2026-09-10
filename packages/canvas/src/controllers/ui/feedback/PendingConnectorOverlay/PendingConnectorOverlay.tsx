import { memo } from "react";

import { ConnectorRenderer } from "../../../../rendering/layers/content/ConnectorRenderer";
import { resolveEndpointOwner } from "../../../../rendering/layers/content/utils/endpoints";
import type { CanvasControllerState } from "../../../CanvasTypes";

type PendingConnectorOverlayProps = Pick<
	CanvasControllerState,
	"connectorDraft" | "objects"
>;

/**
 * Draws the connector being created, which lives only in the draft until dragEnd
 * commits it. A re-anchor draft renders nothing here: it edits the entity in
 * `objects`, which the content layer already draws.
 */
const PendingConnectorOverlayComponent: React.FC<
	PendingConnectorOverlayProps
> = ({ connectorDraft, objects }) => {
	if (connectorDraft?.kind !== "create") {
		return null;
	}

	const { connector } = connectorDraft;
	return (
		<ConnectorRenderer
			connectorState={connector}
			sourceObj={resolveEndpointOwner(objects, connector.source)}
			targetObj={resolveEndpointOwner(objects, connector.target)}
			disablePointerEvents={true}
		/>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
