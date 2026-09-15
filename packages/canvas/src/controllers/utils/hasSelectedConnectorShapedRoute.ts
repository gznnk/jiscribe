import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

/**
 * Whether the selected connector's route was shaped by hand, i.e. it carries
 * vertices of its own. One with none is already the engine's to route, so there
 * is nothing to reset.
 */
export const hasSelectedConnectorShapedRoute = (
	selectedConnectorId: string | null,
	objects: Record<string, ObjectState>,
): boolean => {
	const connector =
		selectedConnectorId !== null ? objects[selectedConnectorId] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return (connector as ConnectorState).points.length > 0;
};
