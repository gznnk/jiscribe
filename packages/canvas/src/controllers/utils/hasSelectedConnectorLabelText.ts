import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";

import { getSelectedConnectorId } from "./getSelectedConnectorId";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * Whether the selected connector carries label text, which is what every row of
 * both surfaces' label sections needs: without it they all draw nothing, and the
 * headings go with them rather than standing over an empty body.
 *
 * The only place the label is read raw. What a row *states* is the value of one
 * `label.*` property, read through the style intent of that name
 * (useSelectionStyle) so the row and the write behind it address the same thing;
 * presence is not a style, so it is answered here.
 *
 * @param selection - The slice a section's `isShown` receives; a selection that is not a lone connector gives false
 */
export const hasSelectedConnectorLabelText = (
	selection: Pick<CanvasControllerState, "selection" | "objects">,
): boolean => {
	const connectorId = getSelectedConnectorId(selection);
	if (connectorId === null) {
		return false;
	}
	const connector = selection.objects[connectorId] as {
		label?: ConnectorLabel;
	};
	return Boolean(connector.label?.text);
};
