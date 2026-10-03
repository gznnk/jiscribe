import { collectObjectPartIds, TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type {
	ObjectPartKindDefinition,
	ObjectPartSelection,
} from "@jiscribe/canvas";
import type {
	CanvasControllerState,
	ObjectPartKindRegistry,
} from "@jiscribe/canvas-sdk";

import { countTableTracks, parseTableTrackPartId } from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { parseTableCellSlotId, TableFeatures } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/** The table a grid command acts on, and the tracks the live selection names on it. */
export type TableTrackSelection = {
	/** The table to rewrite, as `state.objects` keys it. */
	objectId: string;
	/** That table, narrowed. */
	table: TableState;
	/** The referenced track indices along the asked-for axis, unsorted and possibly repeated. */
	indices: number[];
};

/**
 * The track indices the live selection points at along one axis.
 *
 * A selection of the same axis names them outright. A cell selection names them
 * through its cells, which is what lets one click into a table and act either
 * way. A selection of the *other* axis names none: a column tells a row command
 * nothing about which row it means, so the command reports itself unavailable
 * rather than guessing.
 */
const collectReferencedTracks = (
	table: TableState,
	selection: ObjectPartSelection,
	part: ObjectPartKindDefinition,
	axis: TableAxis,
): number[] => {
	if (selection.kind !== axis && selection.kind !== TEXT_SLOT_PART_KIND) {
		return [];
	}
	const count = countTableTracks(table, axis);
	// The selection stores the ends of its ranges, so the kind is asked what they
	// cover before the ids are read as positions.
	const partIds = collectObjectPartIds(selection, part, table);
	const referenced =
		selection.kind === axis
			? partIds.map(parseTableTrackPartId)
			: partIds.map((partId) => {
					const cell = parseTableCellSlotId(partId);
					return cell === null ? null : axis === "row" ? cell.row : cell.column;
				});
	return referenced.filter(
		(index): index is number => index !== null && index >= 0 && index < count,
	);
};

/**
 * What a row/column command acts on, or null when it must report itself
 * unavailable — the one reading of the canvas the insertions and the removals
 * share.
 *
 * The reference is the part selection, not the object selection: every one of
 * these commands is "next to this row / this cell" or "this row", so a table
 * selected as a whole names nothing to act on.
 *
 * @param state - The canvas to read; the sole selected object, the part selection standing on it and whether a text edit is open are all consulted
 * @param axis - The direction the referenced tracks run in
 * @param objectPartKind - Per-canvas ObjectPartKindRegistry, asked what the picked ranges cover under the selection's own kind; a kind the table declares none for names no track
 * @returns The table and at least one track index, or null when the selection is not one table's, names no track along `axis`, or a cell is being edited
 */
export const resolveTableTrackSelection = (
	state: CanvasControllerState,
	axis: TableAxis,
	objectPartKind: ObjectPartKindRegistry,
): TableTrackSelection | null => {
	if (state.textEditState !== null || state.selectedIds.length !== 1) {
		return null;
	}
	const objectId = state.selectedIds[0];
	const object = state.objects[objectId];
	if (object === undefined || object.type !== TableFeatures.type) {
		return null;
	}
	const selection = state.objectPartSelection;
	if (selection === null || selection.objectId !== objectId) {
		return null;
	}

	const part = objectPartKind.get(object.type, selection.kind);
	if (part === undefined) {
		return null;
	}

	const table = object as TableState;
	const indices = collectReferencedTracks(table, selection, part, axis);
	return indices.length === 0 ? null : { objectId, table, indices };
};
