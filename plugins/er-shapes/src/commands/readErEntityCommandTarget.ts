import {
	collectObjectPartIds,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";

import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import {
	parseErEntityColumnPartId,
	countErEntityColumns,
	parseErEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import { ErEntityFeatures } from "../schema/ErEntityDoc";
import type { ErEntityState } from "../state/ErEntityState";

/** The entity a column command acts on. */
export type ErEntityCommandTarget = {
	/** The entity to rewrite, as `state.objects` keys it. */
	objectId: string;
	/** That entity, narrowed. */
	entity: ErEntityState;
};

/**
 * The sole selected entity, while no text is being edited — the precondition
 * every column command shares.
 *
 * @param state - The canvas to read; the selection and whether a text edit is open are consulted
 * @returns The entity, or null when the selection is not exactly one erEntity or an editor is open
 */
export const readErEntityCommandTarget = (
	state: CanvasControllerState,
): ErEntityCommandTarget | null => {
	if (state.textEditState !== null || state.selection.objectIds.length !== 1) {
		return null;
	}
	const objectId = state.selection.objectIds[0];
	const object = state.objects[objectId];
	if (object === undefined || object.type !== ErEntityFeatures.type) {
		return null;
	}
	return { objectId, entity: object as ErEntityState };
};

/**
 * The columns the part picked on the entity refers to, 0-based in declared
 * order, ascending and without repeats: a column pick names its column, a slot
 * pick the columns of the slots it covers. The title slot names no column, so a
 * pick of it alone — like no pick, or a kind of another name — yields none.
 *
 * @param state - The canvas to read; its part selection is taken to stand on the entity, the part being live only on a sole selection
 * @param entity - The selected entity (readErEntityCommandTarget)
 * @param objectPartKind - The canvas's part-kind registry (`registries.objectPartKind`), asked what the picked ranges cover under the pick's own kind
 * @returns The referenced indices; empty when the pick names no column the entity has
 */
export const collectPickedErEntityColumnIndices = (
	state: CanvasControllerState,
	entity: ErEntityState,
	objectPartKind: ICanvasRegistries["objectPartKind"],
): number[] => {
	const pick = state.selection.part;
	if (pick === null) {
		return [];
	}
	const partKind = objectPartKind.get(entity.type, pick.kind);
	if (partKind === undefined) {
		return [];
	}
	const partIds = collectObjectPartIds(pick, partKind, entity);
	let columnIndices: (number | null)[] = [];
	if (pick.kind === ER_ENTITY_COLUMN_PART_KIND) {
		columnIndices = partIds.map(parseErEntityColumnPartId);
	} else if (pick.kind === TEXT_SLOT_PART_KIND) {
		columnIndices = partIds.map(
			(partId) => parseErEntityColumnTextSlotId(partId)?.columnIndex ?? null,
		);
	}
	const columnCount = countErEntityColumns(entity.text);
	const inEntity = new Set(
		columnIndices.filter(
			(columnIndex): columnIndex is number =>
				columnIndex !== null && columnIndex < columnCount,
		),
	);
	return [...inEntity].sort((first, second) => first - second);
};
