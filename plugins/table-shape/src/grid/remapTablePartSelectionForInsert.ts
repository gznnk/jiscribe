import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type { ObjectPartSelection } from "@jiscribe/canvas";

import { parseTableTrackPartId, tableTrackPartId } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import { parseTableCellSlotId, tableCellSlotId } from "../schema/TableDoc";

/** Where an index lands once a track has been inserted at `at`. */
const shiftIndex = (index: number, at: number): number =>
	index >= at ? index + 1 : index;

/** One part id moved along `axis`, or left as it is when it names no position. */
const remapPartId = (
	partId: string,
	kind: string,
	axis: TableAxis,
	at: number,
): string => {
	if (kind === TEXT_SLOT_PART_KIND) {
		const cell = parseTableCellSlotId(partId);
		if (cell === null) {
			return partId;
		}
		return axis === "row"
			? tableCellSlotId(shiftIndex(cell.row, at), cell.column)
			: tableCellSlotId(cell.row, shiftIndex(cell.column, at));
	}
	if (kind !== axis) {
		return partId;
	}
	const index = parseTableTrackPartId(partId);
	return index === null ? partId : tableTrackPartId(shiftIndex(index, at));
};

/**
 * The same selection, on the same parts, after a track has been inserted at
 * `at`. Cell ids and track ids are positional
 * ({@link import("../schema/TableDoc").tableCellSlotId},
 * {@link tableTrackPartId}), so an insertion renames every part behind it and a
 * selection left as written would silently slide one track along.
 *
 * Only the axis that grew moves: a column selection is untouched by an inserted
 * row, and a cell selection moves in one of its two coordinates. The inserted
 * track is never selected — what was picked stays picked, wherever the insertion
 * pushed it.
 *
 * @param selection - The live selection, already known to stand on the table being inserted into; a kind the table has no parts for is returned untouched
 * @param axis - The direction the inserted track runs in, which is the coordinate that moves
 * @param at - Where it was inserted, 0-based; parts at or past it move one along
 * @returns The moved selection, or `selection` itself when nothing about it moved
 */
export const remapTablePartSelectionForInsert = (
	selection: ObjectPartSelection,
	axis: TableAxis,
	at: number,
): ObjectPartSelection => {
	const partIds = selection.partIds.map((partId) =>
		remapPartId(partId, selection.kind, axis, at),
	);
	if (partIds.every((partId, index) => partId === selection.partIds[index])) {
		return selection;
	}
	const { anchorPartId } = selection;
	return {
		...selection,
		partIds,
		anchorPartId:
			anchorPartId === undefined
				? undefined
				: remapPartId(anchorPartId, selection.kind, axis, at),
	};
};
