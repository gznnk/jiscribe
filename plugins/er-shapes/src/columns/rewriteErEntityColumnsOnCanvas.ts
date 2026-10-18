import { isConnectorState } from "@jiscribe/canvas";
import type { ConnectorState, ObjectState } from "@jiscribe/canvas";
import type { EndpointRef } from "@jiscribe/doc";
import { isOwnedEndpointRef } from "@jiscribe/doc";

import { buildErEntityConnectPointRemap } from "./buildErEntityConnectPointRemap";
import type { ErEntityConnectPointRemap } from "./buildErEntityConnectPointRemap";
import type { ErEntityColumnSource } from "./ErEntityColumnSource";
import { rewriteErEntityColumns } from "./rewriteErEntityColumns";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityState } from "../state/ErEntityState";

/** One endpoint after the columns moved: re-anchored where it names a remapped point of `entityId`, any other end as it is. */
const rewriteEndpoint = (
	endpoint: EndpointRef,
	entityId: string,
	remap: ErEntityConnectPointRemap,
): EndpointRef => {
	if (
		!isOwnedEndpointRef(endpoint) ||
		endpoint.owner.id !== entityId ||
		endpoint.anchor.kind !== "connectPoint" ||
		// Not `Object.hasOwn`: a host typechecking these sources may pin a lib below ES2022.
		!Object.prototype.hasOwnProperty.call(remap, endpoint.anchor.id)
	) {
		return endpoint;
	}
	return { ...endpoint, anchor: remap[endpoint.anchor.id] };
};

/**
 * Rewrites one entity's columns in a new order (rewriteErEntityColumns) and
 * keeps every connector attached to a column on that column
 * (buildErEntityConnectPointRemap): a connector on `col:<i>:left|right` follows
 * its column to the index it lands on, and one on a removed column stays
 * attached to the same side of the box, as an edge anchor at the height the row
 * stood, rather than falling to the center or being dropped. One state
 * transition, so a command committing it is undone in one step.
 *
 * @param objects - The canvas's objects; read only
 * @param entityId - The entity to rewrite, which `objects` holds as an erEntity
 * @param columnSources - One entry per column of the result, in declared order (listErEntityColumnSourcesForInsert / listErEntityColumnSourcesForRemoval)
 * @returns A new objects map holding the rewritten entity and every connector whose end moved; the other objects are carried over by reference
 */
export const rewriteErEntityColumnsOnCanvas = (
	objects: Readonly<Record<string, ObjectState>>,
	entityId: string,
	columnSources: readonly ErEntityColumnSource[],
): Record<string, ObjectState> => {
	const startEntity = objects[entityId] as ErEntityState;
	const rewrittenEntity = rewriteErEntityColumns(startEntity, columnSources);
	const remap = buildErEntityConnectPointRemap(
		readCachedErEntityLayout(startEntity),
		readCachedErEntityLayout(rewrittenEntity),
		columnSources,
	);
	const rewrittenObjects: Record<string, ObjectState> = {
		...objects,
		[entityId]: rewrittenEntity,
	};
	for (const [objectId, object] of Object.entries(objects)) {
		if (!isConnectorState(object)) {
			continue;
		}
		const source = rewriteEndpoint(object.source, entityId, remap);
		const target = rewriteEndpoint(object.target, entityId, remap);
		if (source !== object.source || target !== object.target) {
			const rewrittenConnector: ConnectorState = { ...object, source, target };
			rewrittenObjects[objectId] = rewrittenConnector;
		}
	}
	return rewrittenObjects;
};
