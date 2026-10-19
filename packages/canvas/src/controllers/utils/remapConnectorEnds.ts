import type {
	EndpointRef,
	OwnedEndpointRef,
} from "@jiscribe/doc/model/objects/types/EndpointRef";
import { isOwnedEndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";

import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isConnectorState,
	type ConnectorState,
} from "../../states/objects/connector/ConnectorState";

/** One end re-anchored where it names a remapped connect point of `ownerId`, any other end as it is. */
const remapEndpoint = (
	endpoint: EndpointRef,
	ownerId: string,
	remap: Readonly<Record<string, OwnedEndpointRef["anchor"]>>,
): EndpointRef => {
	if (
		!isOwnedEndpointRef(endpoint) ||
		endpoint.owner.id !== ownerId ||
		endpoint.anchor.kind !== "connectPoint" ||
		// Not `Object.hasOwn`: a host typechecking these sources may pin a lib below ES2022.
		!Object.prototype.hasOwnProperty.call(remap, endpoint.anchor.id)
	) {
		return endpoint;
	}
	return { ...endpoint, anchor: remap[endpoint.anchor.id] };
};

/**
 * Re-points the connector ends attached to one object's connect points after the
 * object renumbered or removed them (an ER entity losing a column) — the canvas
 * counterpart of the doc op `remapConnectPoints`. Every end is looked up once
 * against the id it names before the call, so a swap (`a → b`, `b → a`)
 * exchanges the two ends rather than mapping one of them twice. Nothing is
 * committed: the caller folds the result into its own state transition.
 *
 * @param objects - The canvas's objects, the owner's new state included or not; read only
 * @param ownerId - Id of the object whose connect points moved; only ends owned by it are touched
 * @param remap - Keyed by the `connectPoint` id an end names before the change, valued
 *   by the anchor it names after it (the same map as an AI tool's
 *   `connectPointRemap`). Ends on edge or center anchors and ids absent here are left
 *   alone; values are not checked against what the owner offers. An empty map is a no-op
 * @returns `objects` itself when no end moved; otherwise a new map holding every
 *   connector with a moved end, the other objects carried over by reference
 */
export const remapConnectorEnds = (
	objects: Readonly<Record<string, ObjectState>>,
	ownerId: string,
	remap: Readonly<Record<string, OwnedEndpointRef["anchor"]>>,
): Readonly<Record<string, ObjectState>> => {
	let remappedObjects: Record<string, ObjectState> | null = null;
	for (const [objectId, object] of Object.entries(objects)) {
		if (!isConnectorState(object)) {
			continue;
		}
		const source = remapEndpoint(object.source, ownerId, remap);
		const target = remapEndpoint(object.target, ownerId, remap);
		if (source === object.source && target === object.target) {
			continue;
		}
		const remappedConnector: ConnectorState = { ...object, source, target };
		remappedObjects ??= { ...objects };
		remappedObjects[objectId] = remappedConnector;
	}
	return remappedObjects ?? objects;
};
