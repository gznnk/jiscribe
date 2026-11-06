import {
	type RestackBeneathRequest,
	restackBeneath,
} from "@jiscribe/doc/model/objects/utils/restackBeneath";
import type { ConnectorUnderLabelText } from "@jiscribe/doc/text/label/calcLabelTextLayoutMargin";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	type GroupState,
	isGroupState,
} from "../../../../states/objects/primitives/group/GroupState";

/** The object's id followed by the ids of the groups holding it, innermost first. */
const listPathFrom = (
	id: string,
	objects: Record<string, ObjectState>,
): string[] => {
	const path = [id];
	for (
		let parentId = objects[id]?.parentId;
		parentId !== undefined;
		parentId = objects[parentId]?.parentId
	) {
		path.push(parentId);
	}
	return path;
};

/**
 * Move each connector to just beneath the shape whose caption it runs under, within
 * the connector's own parent (restackBeneath), as the doc layer's layout restacks the
 * document (packages/doc/src/ops/layout.ts), so the caption, knocking out what lies
 * behind it, reads over the line.
 *
 * @param rootIds - The canvas's root ids, as the layout found them
 * @param objects - Written in place: a group whose children were restacked is replaced by one with the new `childIds`
 * @param connectors - The connectors to restack, with the owners each runs under the caption of (listConnectorsUnderLabelText)
 * @returns The new root ids (`rootIds` itself when nothing at the root moved), the ids of the groups rewritten, and the ids of the connectors moved
 */
export const restackUnderLabelTexts = (
	rootIds: string[],
	objects: Record<string, ObjectState>,
	connectors: readonly ConnectorUnderLabelText[],
): {
	rootIds: string[];
	restackedGroupIds: string[];
	restackedConnectorIds: string[];
} => {
	// Keyed by the parent group's id, the root under undefined.
	const requestsByParentId = new Map<
		string | undefined,
		RestackBeneathRequest[]
	>();
	for (const { connectorId, ownerIds } of connectors) {
		const parentId = objects[connectorId]?.parentId;
		const request = {
			id: connectorId,
			beneathPaths: ownerIds.map((ownerId) => listPathFrom(ownerId, objects)),
		};
		const requests = requestsByParentId.get(parentId);
		if (requests === undefined) {
			requestsByParentId.set(parentId, [request]);
		} else {
			requests.push(request);
		}
	}
	let restackedRootIds = rootIds;
	const restackedGroupIds: string[] = [];
	const restackedConnectorIds: string[] = [];
	for (const [parentId, requests] of requestsByParentId) {
		if (parentId === undefined) {
			const { orderedIds, movedIds } = restackBeneath(rootIds, requests);
			if (movedIds.length > 0) {
				restackedRootIds = orderedIds;
				restackedConnectorIds.push(...movedIds);
			}
			continue;
		}
		const parent = objects[parentId];
		if (!isGroupState(parent)) {
			continue;
		}
		const { orderedIds, movedIds } = restackBeneath(parent.childIds, requests);
		if (movedIds.length > 0) {
			const restacked: GroupState = { ...parent, childIds: orderedIds };
			objects[parentId] = restacked;
			restackedGroupIds.push(parentId);
			restackedConnectorIds.push(...movedIds);
		}
	}
	return {
		rootIds: restackedRootIds,
		restackedGroupIds,
		restackedConnectorIds,
	};
};
