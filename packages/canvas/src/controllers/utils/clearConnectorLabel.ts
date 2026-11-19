import type { ConnectorState } from "../../states/objects/connector/ConnectorState";

/**
 * The connector with its label taken away, the one rule an emptied label edit
 * (commitTextEditIfNeeded) and a Delete of the picked label (the
 * `connectorLabel` part kind) share. A label carrying a style keeps it with
 * the text emptied, so typing a new one restores the look; its placement goes,
 * since it describes a label that no longer exists and would pin the next one to
 * the old spot. A label left with nothing but text and placement is removed.
 *
 * @param connector - The connector to clear; one with no `label` comes back
 *   without one, a fresh object either way
 * @returns The connector with `label.text` emptied and `position` / `offset`
 *   dropped, or with no `label` key at all when no style key remains
 */
export const clearConnectorLabel = (
	connector: ConnectorState,
): ConnectorState => {
	const { label, ...connectorWithoutLabel } = connector;
	const {
		text: _clearedText,
		position: _clearedPosition,
		offset: _clearedOffset,
		...labelStyles
	} = label ?? {};
	if (Object.keys(labelStyles).length === 0) {
		return connectorWithoutLabel;
	}
	return { ...connectorWithoutLabel, label: { ...labelStyles, text: "" } };
};
