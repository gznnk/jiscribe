import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import type { TableLayoutSource } from "./calcTableLayout";
import { distributeTableTrackSizes } from "./distributeTableTrackSizes";
import { readCachedTableLayout } from "./readCachedTableLayout";
import type { TableRowDoc } from "../schema/TableDoc";

/** The row with `height` as its bound, or with no bound of its own when undefined. */
const withRowBound = (
	row: TableRowDoc,
	height: number | undefined,
): TableRowDoc => {
	if (height !== undefined) {
		return { ...row, height };
	}
	const { height: _droppedHeight, ...unbounded } = row;
	return unbounded;
};

/**
 * The rows a table of `tableHeight` is made of, each keeping the share of the
 * table it is drawn at now — the height twin of distributeTableWidthToColumns,
 * for an outer-frame resize that writes the height (see reconcileTableBoxWithGrid,
 * the sole caller).
 *
 * The proportions are the drawn heights, not the stored bounds: a row its text
 * holds above its bound is as tall as it looks. No row goes under its floor (the
 * layout's `rowFloors`), the proportions, pinning and rounding being
 * {@link distributeTableTrackSizes}'.
 *
 * **A row that lands at its floor stores no bound of its own.** The floor is the
 * text's answer and a bound at or below it changes nothing drawn; the stored bound
 * is only the part of the height the drag asked for beyond the text. Storing the
 * floor instead would make the row keep that height after its text was deleted,
 * so a table dragged to its minimum goes back to following its text entirely.
 *
 * @param startTable - The table as of the write; its rows are rewritten, and its columns, cells and rule width are read to lay out the heights the rows are drawn at
 * @param tableHeight - Height the grid is to report, in the table's local px; at or below the rows' floors summed every row drops its bound
 * @returns A fresh array, an unchanged row keeping its entry and a changed one given a fresh one (without `height` where it dropped its bound); or null when no row's bound would change — including a grid of no rows
 */
export const distributeTableHeightToRows = (
	startTable: TableLayoutSource,
	tableHeight: number,
): TableRowDoc[] | null => {
	const startRows = startTable.rows ?? [];
	if (startRows.length === 0) {
		return null;
	}
	const { rowEdgeYs, rowFloors } = readCachedTableLayout(startTable);
	// Rounded as the sizes are, so a row pinned at its floor compares equal to it
	// below; the row itself is drawn at the unrounded floor, having no bound.
	const floors = rowFloors.map((floor) =>
		roundToDecimal(floor, PRECISION.SIZE),
	);
	const heights = distributeTableTrackSizes(
		startRows.map((_, index) => rowEdgeYs[index + 1] - rowEdgeYs[index]),
		floors,
		tableHeight,
	).map((size, index) => (size <= floors[index] ? undefined : size));

	const isUnchanged = (index: number): boolean =>
		heights[index] === startRows[index].height;
	if (startRows.every((_, index) => isUnchanged(index))) {
		return null;
	}
	return startRows.map((row, index) =>
		isUnchanged(index) ? row : withRowBound(row, heights[index]),
	);
};
