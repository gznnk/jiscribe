import type { ConnectorLabel } from "../../../../../../../schemas/objects/connector/ConnectorDoc";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";

/**
 * Returns the label of the selected connector (selectedConnectorId).
 * A shared helper for label-related menu items (LabelStyleMenu) to read the current value.
 * Equivalent to getFirstSelectedWithProp for shapes, but a connector is accessed via
 * selectedConnectorId and its style is nested under label, so it is retrieved via a
 * separate path.
 */
export const getSelectedConnectorLabel = (
	selectedConnectorId: string | null,
	objects: Record<string, ObjectState>,
): ConnectorLabel | undefined => {
	const connector = selectedConnectorId
		? objects[selectedConnectorId]
		: undefined;
	return (connector as { label?: ConnectorLabel } | undefined)?.label;
};
