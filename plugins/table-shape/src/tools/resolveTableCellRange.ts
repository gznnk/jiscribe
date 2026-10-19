import {
	describeTableExtent,
	formatTableTrackCount,
	formatTableTrackSpan,
} from "./tableResultText";
import type { TableGrid } from "../grid/TableGrid";
import { tableCellTextSlotId } from "../schema/TableDoc";

/** A cell range as the tools take it (tableCellRangeSchema). */
export type TableCellRangeArgs = {
	/** Top row, 0-based. */
	row: number;
	/** Left column, 0-based. */
	column: number;
	/** Rows spanned downwards; 1 when omitted. */
	rowCount?: number;
	/** Columns spanned rightwards; 1 when omitted. */
	columnCount?: number;
};

/** A range checked against a grid. */
export type TableCellRange = {
	/** Top row, 0-based. */
	row: number;
	/** Left column, 0-based. */
	column: number;
	/** Rows spanned, at least 1. */
	rowCount: number;
	/** Columns spanned, at least 1. */
	columnCount: number;
	/** The cells' slot ids, row by row from the top and left to right within a row. */
	cellIds: string[];
};

/**
 * Checks a range against the grid and spells out the cells it covers.
 *
 * @param grid - The grid the range names cells of
 * @param range - The range as the model wrote it
 * @returns The range with its counts filled in and its cells listed
 * @throws When the range reaches past the last row or column, stating the table's extent
 */
export const resolveTableCellRange = (
	grid: TableGrid,
	range: TableCellRangeArgs,
): TableCellRange => {
	const rowCount = range.rowCount ?? 1;
	const columnCount = range.columnCount ?? 1;
	if (
		range.row + rowCount > grid.rows.length ||
		range.column + columnCount > grid.columns.length
	) {
		throw new Error(
			`the range of ${formatTableTrackCount(rowCount, "row")} x ${formatTableTrackCount(columnCount, "column")} from cell [${range.row},${range.column}] runs past the table, which has ${describeTableExtent(grid)}`,
		);
	}
	const cellIds: string[] = [];
	for (let row = range.row; row < range.row + rowCount; row++) {
		for (
			let column = range.column;
			column < range.column + columnCount;
			column++
		) {
			cellIds.push(tableCellTextSlotId(row, column));
		}
	}
	return {
		row: range.row,
		column: range.column,
		rowCount,
		columnCount,
		cellIds,
	};
};

/**
 * A checked range in words for a tool result.
 *
 * @param range - The range as resolveTableCellRange returned it
 * @returns e.g. "cell [1,2]" or "6 cells (rows 0-1 x columns 0-2)"
 */
export const describeTableCellRange = (range: TableCellRange): string => {
	if (range.cellIds.length === 1) {
		return `cell [${range.row},${range.column}]`;
	}
	return `${range.cellIds.length} cells (${formatTableTrackSpan(range.row, range.rowCount, "row")} x ${formatTableTrackSpan(range.column, range.columnCount, "column")})`;
};
