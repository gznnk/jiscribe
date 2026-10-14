import { resizeTableFromDrawnCorner } from "./resizeTableFromDrawnCorner";
import type { TableState } from "./TableState";
import { calcTableColumnsWidth } from "../layout/calcTableLayout";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * The table with `columns` in place of its own and its width set to their sum,
 * grown or shrunk from the corner it is drawn from (resizeTableFromDrawnCorner).
 *
 * A drag that changes the columns' total has to write the box itself: the content
 * resizer reads a `width` the columns do not sum to as an outer-frame resize and
 * would spread it back over every column (reconcileTableBoxWithGrid). The height
 * is carried over, the resizer re-deriving it from the rows on the same tick.
 *
 * @param startTable - The table as of gesture start; the kept corner is read off its box, so it must still be the box the table is drawn at
 * @param columns - The columns the table ends up with, left to right
 * @returns A new state with the columns, the width and the recentred origin; every other field is carried over
 */
export const resizeTableToColumns = (
	startTable: TableState,
	columns: TableColumnDoc[],
): TableState => ({
	...resizeTableFromDrawnCorner(startTable, {
		width: calcTableColumnsWidth(columns),
		height: startTable.height,
	}),
	columns,
});
