import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { isOrthogonalRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";

/**
 * Returns the current routing of the selected connector.
 * Defaults to orthogonal when routing is omitted.
 */
export const getSelectedRouting = (
	state: CanvasControllerState,
): ConnectorRouting => {
	const id = state.selectedConnectorId;
	const connector = id !== null ? state.objects[id] : undefined;
	const routing = (connector as Record<string, unknown> | undefined)
		?.routing as ConnectorRouting | undefined;
	return isOrthogonalRouting(routing) ? "orthogonal" : "straight";
};
