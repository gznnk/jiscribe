import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";

import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * Returns the label of the selected connector.
 * A shared helper for the label rows of both surfaces (the ObjectMenu's LabelStyleMenu
 * and the properties sidebar's Label section) to read the current value.
 * Equivalent to getFirstSelectedWithProp for shapes, but a connector's style is
 * nested under label, so it is retrieved via a separate path.
 */
export const getSelectedConnectorLabel = (
	connectorId: string | null,
	objects: Record<string, ObjectState>,
): ConnectorLabel | undefined => {
	const connector = connectorId ? objects[connectorId] : undefined;
	return (connector as { label?: ConnectorLabel } | undefined)?.label;
};
