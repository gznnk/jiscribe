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
	// data-testid: the draft reuses the connector's own renderer, so it carries
	// data-kind=connector and the id the commit will use, from the first drag
	// frame on. e2e excludes this subtree so the draft is not mistaken for the
	// committed connector (the same reason DrawingPreviewOverlay carries one).
	return (
		<g data-testid="pending-connector">
			<ConnectorRenderer
				connectorState={connector}
				sourceObj={resolveEndpointOwner(objects, connector.source)}
				targetObj={resolveEndpointOwner(objects, connector.target)}
				disablePointerEvents={true}
			/>
		</g>
	);
};

export const PendingConnectorOverlay = memo(PendingConnectorOverlayComponent);
