import { isOrthogonalRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";

/**
 * Returns the current routing of the selected connector.
 * Defaults to orthogonal when routing is omitted.
 */
export const getSelectedRouting = (
	selectedConnectorId: string | null,
	objects: Record<string, ObjectState>,
): ConnectorRouting => {
	const connector =
		selectedConnectorId !== null ? objects[selectedConnectorId] : undefined;
	const routing = (connector as Record<string, unknown> | undefined)
		?.routing as ConnectorRouting | undefined;
	return isOrthogonalRouting(routing) ? "orthogonal" : "straight";
};
