import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";

import type { CanvasControllerState } from "../CanvasTypes";
import { getSelectedConnectorId } from "./getSelectedConnectorId";

/**
 * Returns the label of the selected connector.
 * A shared helper for the label rows of both surfaces (the ObjectMenu's LabelStyleMenu
 * and the properties sidebar's Label section) to read the current value.
 * Equivalent to getFirstSelectedWithProp for shapes, but a connector's style is
 * nested under label, so it is retrieved via a separate path.
 *
 * @param selection - The selection and the objects it names; a selection that is not a lone connector gives undefined
 */
export const getSelectedConnectorLabel = (
	selection: Pick<CanvasControllerState, "selection" | "objects">,
): ConnectorLabel | undefined => {
	const connectorId = getSelectedConnectorId(selection);
	const connector = connectorId ? selection.objects[connectorId] : undefined;
	return (connector as { label?: ConnectorLabel } | undefined)?.label;
};
