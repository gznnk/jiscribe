import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isConnectorState } from "../../states/objects/connector/ConnectorState";

/** What a requested selection turns into */
export type ResolvedSelection = {
	/** Ids that become `selection.objectIds`: either shapes and groups, or a single connector */
	selectedIds: string[];
	/**
	 * Requested ids that could not be selected: ids absent from the canvas, and
	 * connectors asked for alongside anything else (only one connector can be
	 * selected, and never together with shapes)
	 */
	ignoredIds: string[];
};

/**
 * Maps a host-requested id list onto the selection state.
 *
 * A connector is selectable only on its own — the id list a host hands over
 * cannot express that, so this decides what of it is applicable and reports the
 * rest.
 *
 * @param requestedIds - Ids to select, in the caller's order. Duplicates are
 *   collapsed; an empty list clears the selection
 * @param objects - Flat object map the ids are resolved against
 * @returns The selection plus the dropped ids (see {@link ResolvedSelection})
 */
export const resolveRequestedSelection = (
	requestedIds: readonly string[],
	objects: Record<string, ObjectState>,
): ResolvedSelection => {
	const objectIds: string[] = [];
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
		objectIds.push(id);
	}

	// A lone connector becomes the whole selection; anything else leaves it to the
	// shapes and reports the connectors as dropped.
	const takesSelection = connectorIds.length === 1 && objectIds.length === 0;
	return {
		selectedIds: takesSelection ? [connectorIds[0]] : objectIds,
		ignoredIds: takesSelection ? ignoredIds : [...ignoredIds, ...connectorIds],
	};
};
