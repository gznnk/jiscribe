import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connections/connector/ConnectorState";

/** What a requested selection turns into, split by the state's two channels */
export type ResolvedSelection = {
	/** Ids that go into `selectedIds` (shapes and groups, never connectors) */
	selectedIds: string[];
	/** Id that goes into `selectedConnectorId`; null when no connector is selected */
	selectedConnectorId: string | null;
	/**
	 * Requested ids that could not be selected: ids absent from the canvas, and
	 * connectors asked for alongside anything else (only one connector can be
	 * selected, and never together with shapes)
	 */
	ignoredIds: string[];
};

/**
 * Maps a host-requested id list onto the selection state's two channels.
 *
 * Shapes and connectors are selected through separate fields, and a connector is
 * selectable only on its own — the id list a host hands over cannot express that,
 * so this decides what of it is applicable and reports the rest.
 *
 * @param requestedIds - Ids to select, in the caller's order. Duplicates are
 *   collapsed; an empty list clears the selection
 * @param objects - Flat object map the ids are resolved against
 * @returns The two channels plus the dropped ids (see {@link ResolvedSelection})
 */
export const resolveRequestedSelection = (
	requestedIds: readonly string[],
	objects: Record<string, ObjectState>,
): ResolvedSelection => {
	const selectedIds: string[] = [];
	const connectorIds: string[] = [];
	const ignoredIds: string[] = [];

	for (const id of new Set(requestedIds)) {
		const obj = objects[id];
		if (!obj) {
			ignoredIds.push(id);
			continue;
		}
		if (isConnectorState(obj)) {
			connectorIds.push(id);
			continue;
		}
		selectedIds.push(id);
	}

	// A lone connector takes the connector channel; anything else leaves it empty
	// and reports the connectors as dropped.
	const takesConnectorChannel =
		connectorIds.length === 1 && selectedIds.length === 0;
	return {
		selectedIds,
		selectedConnectorId: takesConnectorChannel ? connectorIds[0] : null,
		ignoredIds: takesConnectorChannel
			? ignoredIds
			: [...ignoredIds, ...connectorIds],
	};
};
