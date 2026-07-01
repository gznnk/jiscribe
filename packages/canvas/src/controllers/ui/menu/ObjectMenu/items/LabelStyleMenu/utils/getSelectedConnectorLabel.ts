import type { ConnectorLabel } from "../../../../../../../schemas/objects/connections/connector/ConnectorDoc";
import type { CanvasControllerState } from "../../../../../../CanvasTypes";

/**
 * Returns the label of the selected connector (selectedConnectorId).
 * A shared helper for label-related menu items (LabelStyleMenu) to read the current value.
 * Equivalent to getFirstSelectedWithProp for shapes, but a connector is accessed via
 * selectedConnectorId and its style is nested under label, so it is retrieved via a
 * separate path.
 */
export const getSelectedConnectorLabel = (
	state: CanvasControllerState,
): ConnectorLabel | undefined => {
	const id = state.selectedConnectorId;
	const connector = id ? state.objects[id] : undefined;
	return (connector as { label?: ConnectorLabel } | undefined)?.label;
};
