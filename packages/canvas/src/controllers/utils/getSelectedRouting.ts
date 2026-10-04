import { isOrthogonalRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "@jiscribe/doc/model/objects/types/ConnectorRouting";

import type { CanvasControllerState } from "../CanvasTypes";
import { getSelectedConnectorId } from "./getSelectedConnectorId";

/**
 * Returns the current routing of the selected connector.
 * Defaults to orthogonal when routing is omitted.
 *
 * @param selection - The selection and the objects it names; a selection that is not a lone connector gives the orthogonal default
 */
export const getSelectedRouting = (
	selection: Pick<CanvasControllerState, "selection" | "objects">,
): ConnectorRouting => {
	const connectorId = getSelectedConnectorId(selection);
	const connector =
		connectorId !== null ? selection.objects[connectorId] : undefined;
	const routing = (connector as Record<string, unknown> | undefined)
		?.routing as ConnectorRouting | undefined;
	return isOrthogonalRouting(routing) ? "orthogonal" : "straight";
};
