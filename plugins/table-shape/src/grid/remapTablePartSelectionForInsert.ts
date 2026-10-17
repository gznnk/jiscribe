import type { ObjectPartSelection } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";

import { parseTableTrackPartId, tableTrackPartId } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import {
	parseTableCellTextSlotId,
	tableCellTextSlotId,
} from "../schema/TableDoc";

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
		const cell = parseTableCellTextSlotId(partId);
		if (cell === null) {
			return partId;
		}
		return axis === "row"
			? tableCellTextSlotId(shiftIndex(cell.row, at), cell.column)
			: tableCellTextSlotId(cell.row, shiftIndex(cell.column, at));
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
 * ({@link import("../schema/TableDoc").tableCellTextSlotId},
 * {@link tableTrackPartId}), so an insertion renames every part behind it and a
 * selection left as written would silently slide one track along.
 *
 * Only the axis that grew moves: a column selection is untouched by an inserted
 * row, and a cell selection moves in one of its two coordinates.
 *
 * Each end of every range moves on its own, the anchor as readily as the focus.
 * An insertion before a range slides it along whole; one inside it, between its
 * two ends, widens it over the inserted track, as a spreadsheet's range
 * reference grows when a row is inserted within it.
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
	const ranges = selection.ranges.map((range) => ({
		anchorId: remapPartId(range.anchorId, selection.kind, axis, at),
		focusId: remapPartId(range.focusId, selection.kind, axis, at),
	}));
	const isUnmoved = ranges.every(
		(range, index) =>
			range.anchorId === selection.ranges[index].anchorId &&
			range.focusId === selection.ranges[index].focusId,
	);
	return isUnmoved ? selection : { ...selection, ranges };
};
