import { isConnectorState } from "@jiscribe/canvas";
import type { ConnectorState, ObjectState } from "@jiscribe/canvas";
import { roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import type { EndpointRef, OwnedEndpointRef } from "@jiscribe/doc";
import { isOwnedEndpointRef } from "@jiscribe/doc";

import { rewriteErEntityColumns } from "./rewriteErEntityColumns";
import type { ErEntityColumnSource } from "./rewriteErEntityColumns";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import {
	countErEntityColumns,
	erEntityColumnConnectPointId,
	parseErEntityColumnConnectPointId,
} from "../schema/erEntityColumnIds";
import type { ErEntityColumnConnectPointSide } from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/** What the rewrite needs of the columns: where each column of the entity before lands after it. */
type ErEntityColumnMove = {
	/** The entity before the rewrite, whose rows the attached ends sat on. */
	startEntity: ErEntityState;
	/** How many columns `startEntity` has. */
	startColumnCount: number;
	/** The entity after the rewrite. */
	rewrittenEntity: ErEntityState;
	/** By the index a column had before: the index it has after, absent for a removed one. */
	newIndexByStartIndex: ReadonlyMap<number, number>;
};

/** The column connect point of `entityId` an endpoint is attached to, or null for any other end. */
const readColumnAttachment = (
	endpoint: OwnedEndpointRef,
	entityId: string,
): { columnIndex: number; side: ErEntityColumnConnectPointSide } | null => {
	if (
		endpoint.owner.id !== entityId ||
		endpoint.anchor.kind !== "connectPoint"
	) {
		return null;
	}
	return parseErEntityColumnConnectPointId(endpoint.anchor.id);
};

/**
 * Where on its side of the box a removed column's row sat, as an edge anchor's
 * ratio along the rewritten box: the row center's distance from the top edge —
 * the drawn corner the rewrite keeps — over the new height, held to the edge.
 */
const calcRemovedRowRatio = (
	columnMove: ErEntityColumnMove,
	startColumnIndex: number,
): number => {
	const startLayout = readCachedErEntityLayout(columnMove.startEntity);
	const { band } = startLayout.rows[startColumnIndex];
	const rewrittenHeight = readCachedErEntityLayout(
		columnMove.rewrittenEntity,
	).height;
	const rowCenterFromTop = band.y + band.height / 2 + startLayout.height / 2;
	return roundDocCoordinate(
		Math.min(Math.max(rowCenterFromTop / rewrittenHeight, 0), 1),
	);
};

/**
 * One endpoint after the columns moved: on a moved column, the same side of the
 * column's new index; on a removed column, an edge anchor on the same side of the
 * box at the height the row stood (the attachment kept rather than the connector
 * dropped, as core keeps a connector whose owner is deleted); any other end as
 * it is — one naming a column the entity did not have included, which already
 * drew at the center (resolveEndpoint) and is no column's to carry.
 */
const rewriteEndpoint = (
	endpoint: EndpointRef,
	entityId: string,
	columnMove: ErEntityColumnMove,
): EndpointRef => {
	if (!isOwnedEndpointRef(endpoint)) {
		return endpoint;
	}
	const attachment = readColumnAttachment(endpoint, entityId);
	if (
		attachment === null ||
		attachment.columnIndex >= columnMove.startColumnCount
	) {
		return endpoint;
	}
	const newIndex = columnMove.newIndexByStartIndex.get(attachment.columnIndex);
	if (newIndex === attachment.columnIndex) {
		return endpoint;
	}
	if (newIndex !== undefined) {
		return {
			...endpoint,
			anchor: {
				kind: "connectPoint",
				id: erEntityColumnConnectPointId(newIndex, attachment.side),
			},
		};
	}
	return {
		...endpoint,
		anchor: {
			kind: "edge",
			side: attachment.side,
			t: calcRemovedRowRatio(columnMove, attachment.columnIndex),
		},
	};
};

/**
 * Rewrites one entity's columns in a new order (rewriteErEntityColumns) and
 * keeps every connector attached to a column on that column: a connector on
 * `col:<i>:left|right` follows its column to the index it lands on, and one on a
 * removed column stays attached to the same side of the box, as an edge anchor
 * at the height the row stood, rather than falling to the center or being
 * dropped. One state transition, so a command committing it is undone in one
 * step.
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
	const newIndexByStartIndex = new Map<number, number>();
	columnSources.forEach((sourceIndex, newIndex) => {
		if (sourceIndex !== null) {
			newIndexByStartIndex.set(sourceIndex, newIndex);
		}
	});
	const columnMove: ErEntityColumnMove = {
		startEntity,
		startColumnCount: countErEntityColumns(startEntity.text),
		rewrittenEntity,
		newIndexByStartIndex,
	};
	const rewrittenObjects: Record<string, ObjectState> = {
		...objects,
		[entityId]: rewrittenEntity,
	};
	for (const [objectId, object] of Object.entries(objects)) {
		if (!isConnectorState(object)) {
			continue;
		}
		const source = rewriteEndpoint(object.source, entityId, columnMove);
		const target = rewriteEndpoint(object.target, entityId, columnMove);
		if (source !== object.source || target !== object.target) {
			const rewrittenConnector: ConnectorState = { ...object, source, target };
			rewrittenObjects[objectId] = rewrittenConnector;
		}
	}
	return rewrittenObjects;
};
