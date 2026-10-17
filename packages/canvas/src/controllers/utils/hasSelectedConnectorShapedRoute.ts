import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";
import { getSelectedConnectorId } from "../selection/readers/getSelectedConnectorId";

/**
 * Whether the selected connector's route was shaped by hand, i.e. it carries
 * vertices of its own. One with none is already the engine's to route, so there
 * is nothing to reset.
 *
 * @param selection - The selection and the objects it names; a selection that is not a lone connector gives false
 */
export const hasSelectedConnectorShapedRoute = (
	selection: Pick<CanvasControllerState, "selection" | "objects">,
): boolean => {
	const connectorId = getSelectedConnectorId(selection);
	const connector =
		connectorId !== null ? selection.objects[connectorId] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return (connector as ConnectorState).points.length > 0;
};
