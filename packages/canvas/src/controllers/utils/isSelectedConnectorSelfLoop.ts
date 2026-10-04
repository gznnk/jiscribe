import { isSelfLoopConnector } from "@jiscribe/doc/model/objects/connector/isSelfLoopConnector";

import type { ConnectorState } from "../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";
import { getSelectedConnectorId } from "./getSelectedConnectorId";

/**
 * Whether the selected connector is a self-loop. Self-loops are orthogonal-only,
 * so the routing toggle is not rendered (switching to straight would break them).
 *
 * @param selection - The selection and the objects it names; a selection that is not a lone connector gives false
 */
export const isSelectedConnectorSelfLoop = (
	selection: Pick<CanvasControllerState, "selectedIds" | "objects">,
): boolean => {
	const connectorId = getSelectedConnectorId(selection);
	const connector =
		connectorId !== null ? selection.objects[connectorId] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return isSelfLoopConnector(connector as ConnectorState);
};
