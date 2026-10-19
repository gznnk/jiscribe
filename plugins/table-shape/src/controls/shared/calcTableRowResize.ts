import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import type { TableLayoutSource } from "../../layout/calcTableLayout";
import { readCachedTableLayout } from "../../layout/readCachedTableLayout";
import { TABLE_MIN_ROW_HEIGHT } from "../../schema/TableDoc";
import type { TableRowDoc } from "../../schema/TableDoc";

/**
 * A row bound as the document may hold it: never below
 * {@link TABLE_MIN_ROW_HEIGHT}, at the precision sizes are stored to.
 *
 * @param height - The bound asked for, in local px; may be negative, a drag having no lower limit of its own
 */
export const clampTableRowHeight = (height: number): number =>
	roundToDecimal(Math.max(height, TABLE_MIN_ROW_HEIGHT), PRECISION.SIZE);

/**
 * The rows with one row's stored bound moved by a drag and every other bound
 * kept, so the table's height changes by what that row gained or lost. The drag
 * is measured from the height the row is *drawn* at (the layout's, not the stored
 * one), so grabbing its rule and moving it 10px moves it 10px whatever the row
 * stored beforehand.
 *
 * **A row's stored height is a lower bound, not its height** ({@link TableRowDoc}):
 * the layout draws it at the greater of that bound and what its tallest cell's
 * text needs (calcTableLayout), so dragging up stops at the row's text. The bound
 * written is what the drag asked for, not that floor: storing the floor would make
 * the row keep that height after its text was deleted.
 *
 * Shared by the two drags that resize a single row: the inner boundary's
 * `"leading"` mode (calcTableRowBoundaryDrag) and the table's trailing edge
 * (handleTableTrailingEdge).
 *
 * @param startTable - The table as of gesture start; its rows are rewritten, and its columns, cells and rule width are read to lay out the heights the rows are drawn at
 * @param rowIndex - Which row resizes, 0-based from the table's leading edge; the last row is the one the trailing edge resizes
 * @param localDeltaY - How far the row's trailing rule moved along the table's local y axis, in px; positive heightens it. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @returns Fresh rows with that one's bound rewritten, never below `TABLE_MIN_ROW_HEIGHT`, or null when the index names no row
 */
export const calcTableRowResize = (
	startTable: TableLayoutSource,
	rowIndex: number,
	localDeltaY: number,
): TableRowDoc[] | null => {
	const startRows = startTable.rows ?? [];
	const row = startRows[rowIndex];
	if (row === undefined) {
		return null;
	}
	const { rowEdgeYs } = readCachedTableLayout(startTable);
	const drawnHeight = rowEdgeYs[rowIndex + 1] - rowEdgeYs[rowIndex];
	const resized = [...startRows];
	resized[rowIndex] = {
		...row,
		height: clampTableRowHeight(drawnHeight + localDeltaY),
	};
	return resized;
};
