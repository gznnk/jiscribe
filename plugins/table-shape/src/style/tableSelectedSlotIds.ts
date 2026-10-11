import {
	collectObjectPartIds,
	selectedSlotIds,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas-sdk";
import type { SlotIdsOf } from "@jiscribe/canvas-sdk";

import { collectTableTrackCellIds } from "../grid/collectTableTrackCellIds";
import {
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import { TABLE_TRACK_PART_DEFINITIONS } from "../parts/tableTrackParts";
import type { TableState } from "../state/TableState";

/** The axis a pick of whole tracks runs along, or null for a pick of anything else. */
const toTableAxis = (kind: string): TableAxis | null => {
	if (kind === TABLE_ROW_PART_KIND) {
		return TABLE_ROW_PART_KIND;
	}
	if (kind === TABLE_COLUMN_PART_KIND) {
		return TABLE_COLUMN_PART_KIND;
	}
	return null;
};

/**
 * Which cells a whole-slot text style lands on: the picked cells, the cells of
 * the picked rows or columns, or every cell with nothing picked. Core's own answer
 * (selectedSlotIds) knows the cells but not the tracks, and would read a row pick
 * as no slot pick at all — every cell of the grid.
 *
 * @param object - The table the style is written to or read from
 * @param pick - What is picked inside it: cells (`"textSlot"`), whole rows or columns, or null for the table as a whole; a kind the table does not declare addresses every cell, as core's answer does
 * @param ctx - The style walk's context, handed on to `selectedSlotIds` for a cell pick; a track pick is expanded through the table's own definitions (TABLE_TRACK_PART_DEFINITIONS)
 * @returns Cell slot ids in the order the ranges cover them, track by track for a track pick; ids past the grid are left for the entry to skip
 */
export const tableSelectedSlotIds: SlotIdsOf<TableState> = (
	object,
	pick,
	ctx,
) => {
	if (pick === null) {
		return Object.keys(object.text);
	}
	if (pick.kind === TEXT_SLOT_PART_KIND) {
		return selectedSlotIds(object, pick, ctx);
	}
	const axis = toTableAxis(pick.kind);
	if (axis === null) {
		return Object.keys(object.text);
	}
	return collectTableTrackCellIds(
		object,
		axis,
		collectObjectPartIds(pick, TABLE_TRACK_PART_DEFINITIONS[axis], object),
	);
};
