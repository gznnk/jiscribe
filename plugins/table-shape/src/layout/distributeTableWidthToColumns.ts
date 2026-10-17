import { distributeTableTrackSizes } from "./distributeTableTrackSizes";
import { TABLE_MIN_COLUMN_WIDTH } from "../schema/TableDoc";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * The column widths a table of `tableWidth` is made of, each column keeping the
 * share of the total it holds now. What turns an outer-frame resize into the only
 * thing a table document stores about its size (see reconcileTableBoxWithGrid,
 * the sole caller): the transform frame writes a width, and this is what the grid
 * becomes so as to report that width back.
 *
 * The proportions, the pinning and the rounding are {@link distributeTableTrackSizes},
 * with every column's floor at {@link TABLE_MIN_COLUMN_WIDTH}: no column goes under
 * it, and a width below calcTableMinWidth builds the grid at that floor, so
 * the table stops there rather than narrowing past it.
 *
 * @param startColumns - The columns as of the write, left to right; read only, and the returned array is a fresh one whose entries are fresh too
 * @param tableWidth - Width the grid is to report, in the table's local px; below the grid's minimum it is raised to it, and a value at or under 0 yields a grid of minimums
 * @returns Fresh columns summing to `tableWidth`, or null when no column's width would change — including a grid of no columns, which has nothing to distribute into
 */
export const distributeTableWidthToColumns = (
	startColumns: readonly TableColumnDoc[],
	tableWidth: number,
): TableColumnDoc[] | null => {
	if (startColumns.length === 0) {
		return null;
	}
	const widths = distributeTableTrackSizes(
		startColumns.map((column) => column.width),
		startColumns.map(() => TABLE_MIN_COLUMN_WIDTH),
		tableWidth,
	);

	if (
		widths.every(
			(columnWidth, index) => columnWidth === startColumns[index].width,
		)
	) {
		return null;
	}
	return startColumns.map((column, index) => ({
		...column,
		width: widths[index],
	}));
};
