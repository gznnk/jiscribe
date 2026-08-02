import { isSelfLoopConnector } from "../../../../../../../schemas/objects/connections/connector/isSelfLoopConnector";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../../states/objects/connections/connector/ConnectorState";

/**
 * Whether the selected connector is a self-loop. Self-loops are orthogonal-only,
 * so the routing toggle is not rendered (switching to straight would break them).
 */
export const isSelectedConnectorSelfLoop = (
	selectedConnectorId: string | null,
	objects: Record<string, ObjectState>,
): boolean => {
	const connector =
		selectedConnectorId !== null ? objects[selectedConnectorId] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return isSelfLoopConnector(connector as ConnectorState);
};
