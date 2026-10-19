import type { ObjectState } from "@jiscribe/canvas";
import { remapConnectorEnds } from "@jiscribe/canvas-sdk";

import { buildErEntityConnectPointRemap } from "./buildErEntityConnectPointRemap";
import type { ErEntityConnectPointRemap } from "./buildErEntityConnectPointRemap";
import type { ErEntityColumnSource } from "./ErEntityColumnSource";
import { rewriteErEntityColumns } from "./rewriteErEntityColumns";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * Rewrites one entity's columns in a new order (rewriteErEntityColumns) and says
 * where its column connect points go (buildErEntityConnectPointRemap), in the
 * shape a part kind's `delete` answers with — core then moves the connectors.
 *
 * @param entity - The entity to rewrite; left untouched
 * @param columnSources - One entry per column of the result, in declared order (listErEntityColumnSourcesForInsert / listErEntityColumnSourcesForRemoval)
 * @returns The rewritten entity as `object`, and the remap keyed by the connect point ids of `entity`
 */
export const rewriteErEntityColumnsWithRemap = (
	entity: ErEntityState,
	columnSources: readonly ErEntityColumnSource[],
): { object: ErEntityState; connectPointRemap: ErEntityConnectPointRemap } => {
	const rewrittenEntity = rewriteErEntityColumns(entity, columnSources);
	return {
		object: rewrittenEntity,
		connectPointRemap: buildErEntityConnectPointRemap(
			readCachedErEntityLayout(entity),
			readCachedErEntityLayout(rewrittenEntity),
			columnSources,
		),
	};
};

/**
 * Rewrites one entity's columns in a new order and keeps every connector
 * attached to a column on that column (rewriteErEntityColumnsWithRemap,
 * remapConnectorEnds): a connector on `col:<i>:left|right` follows its
 * column to the index it lands on, and one on a removed column stays attached
 * to the same side of the box, as an edge anchor at the height the row stood,
 * rather than falling to the center or being dropped. One state transition, so
 * a command committing it is undone in one step.
 *
 * @param objects - The canvas's objects; read only
 * @param entityId - The entity to rewrite, which `objects` holds as an erEntity
 * @param columnSources - One entry per column of the result, in declared order (listErEntityColumnSourcesForInsert / listErEntityColumnSourcesForRemoval)
 * @returns A new objects map holding the rewritten entity and every connector whose end moved; the other objects are carried over by reference
 */
export const rewriteErEntityColumnsWithConnectors = (
	objects: Readonly<Record<string, ObjectState>>,
	entityId: string,
	columnSources: readonly ErEntityColumnSource[],
): Readonly<Record<string, ObjectState>> => {
	const { object: rewrittenEntity, connectPointRemap } =
		rewriteErEntityColumnsWithRemap(
			objects[entityId] as ErEntityState,
			columnSources,
		);
	return remapConnectorEnds(
		{ ...objects, [entityId]: rewrittenEntity },
		entityId,
		connectPointRemap,
	);
};
