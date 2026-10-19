import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import { TABLE_MIN_COLUMN_WIDTH } from "../../schema/TableDoc";
import type { TableColumnDoc } from "../../schema/TableDoc";

/**
 * The columns with one of them resized by a drag and every other one kept, so the
 * table's width changes by what that column gained or lost. The column stops at
 * {@link TABLE_MIN_COLUMN_WIDTH} rather than passing it.
 *
 * Shared by the two drags that resize a single column: the inner boundary's
 * `"leading"` mode (calcTableColumnBoundaryDrag) and the table's trailing edge
 * (handleTableTrailingEdge).
 *
 * @param startColumns - The columns as of gesture start, left to right; read only, and the returned array is a fresh one
 * @param columnIndex - Which column resizes, 0-based from the table's leading edge; the last column is the one the trailing edge resizes
 * @param localDeltaX - How far the column's trailing rule moved along the table's local x axis, in px; positive widens it. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @returns Fresh columns with that one's width rewritten at the stored precision, or null when the index names no column
 */
export const calcTableColumnResize = (
	startColumns: readonly TableColumnDoc[],
	columnIndex: number,
	localDeltaX: number,
): TableColumnDoc[] | null => {
	const column = startColumns[columnIndex];
	if (column === undefined) {
		return null;
	}
	const resized = [...startColumns];
	resized[columnIndex] = {
		...column,
		width: roundToDecimal(
			Math.max(column.width + localDeltaX, TABLE_MIN_COLUMN_WIDTH),
			PRECISION.SIZE,
		),
	};
	return resized;
};
