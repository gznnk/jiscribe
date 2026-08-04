import { getRootConnectorIds } from "./getRootConnectorIds";
import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../presentations/layers/content/utils/endpoints";
import type { FreeEndpointRef } from "../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../registries/ICanvasRegistries";

/**
 * Clean up connectors that are affected by shape deletion.
 *
 * - Both endpoints connect to deleted shapes → the connector is deleted too
 * - Only one endpoint connects to a deleted shape → convert the deleted side's endpoint to Free and keep it (if the coordinate cannot be resolved, delete the connector too)
 *
 * Since connectors are managed intermixed in rootIds, deleted connectors are also removed from rootIds.
 *
 * @param state - The canvas state before deletion (used to resolve endpoint coordinates)
 * @param idsToDelete - The set of IDs of objects to delete
 * @param registries - Per-canvas registries, read for the outline / anchor-region
 *   geometry so the endpoint left behind sits where the line was drawn
 */
export function cleanupConnectorsOnDelete(
	state: CanvasControllerState,
	idsToDelete: Set<string>,
	registries: ICanvasRegistries,
): CanvasControllerState {
	const updatedObjects = { ...state.objects };
	const removedConnectorIds = new Set<string>();
	let hasChanges = false;

	for (const connectorId of getRootConnectorIds(state.objects, state.rootIds)) {
		// Skip connectors that are themselves already marked for deletion
		if (idsToDelete.has(connectorId)) {
			continue;
		}

		const connector = state.objects[connectorId] as ConnectorState | undefined;
		if (!connector) {
			continue;
		}

		const sourceOwnerId = connector.source.owner?.id;
		const targetOwnerId = connector.target.owner?.id;

		const sourceDeleted =
			sourceOwnerId != null && idsToDelete.has(sourceOwnerId);
		const targetDeleted =
			targetOwnerId != null && idsToDelete.has(targetOwnerId);

		if (!sourceDeleted && !targetDeleted) {
			continue;
		}

		hasChanges = true;

		// If no connection target remains after deletion (an already-Free end + a deleted end), delete the connector too
		const sourceWillBeFree = sourceOwnerId == null || sourceDeleted;
		const targetWillBeFree = targetOwnerId == null || targetDeleted;
		if (sourceWillBeFree && targetWillBeFree) {
			delete updatedObjects[connectorId];
			removedConnectorIds.add(connectorId);
			continue;
		}

		// One endpoint deleted → convert the deleted side to Free
		// Use resolveConnectorPoints with the same registries the rendering uses, so the frozen
		// coordinate is the one that was on screen (outline adjustment for center anchors included).
		// Since it uses the pre-deletion state.objects, both endpoint objects still exist.
		const sourceObj = resolveEndpointOwner(state.objects, connector.source);
		const targetObj = resolveEndpointOwner(state.objects, connector.target);
		const resolved = resolveConnectorPoints(
			connector,
			sourceObj,
			targetObj,
			registries.objectOutline,
			registries.objectAnchorRegion,
			registries.objectExtraConnectPoints,
		);

		const updatedConnector = { ...connector };
		let shouldDeleteConnector = false;

		if (sourceDeleted) {
			const point = resolved?.source;
			if (point == null) {
				shouldDeleteConnector = true;
			} else {
				const freeSource: FreeEndpointRef = { anchor: { kind: "free", point } };
				updatedConnector.source = freeSource;
			}
		}

		if (!shouldDeleteConnector && targetDeleted) {
			const point = resolved?.target;
			if (point == null) {
				shouldDeleteConnector = true;
			} else {
				const freeTarget: FreeEndpointRef = { anchor: { kind: "free", point } };
				updatedConnector.target = freeTarget;
			}
		}

		if (shouldDeleteConnector) {
			delete updatedObjects[connectorId];
			removedConnectorIds.add(connectorId);
			continue;
		}

		updatedObjects[connectorId] = updatedConnector as ConnectorState;
	}

	if (!hasChanges) {
		return state;
	}

	return {
		...state,
		objects: updatedObjects,
		rootIds:
			removedConnectorIds.size > 0
				? state.rootIds.filter((id) => !removedConnectorIds.has(id))
				: state.rootIds,
	};
}
