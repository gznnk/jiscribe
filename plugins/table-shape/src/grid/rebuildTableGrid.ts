import type { TableGrid } from "./TableGrid";
import { tableCellTextSlotId } from "../schema/TableDoc";
import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * The grid with new axes on it: the tracks as given, and `text` rebuilt from
 * `cellAt` so its keys are exactly `tableCellTextSlotIds(rows.length,
 * columns.length)`.
 *
 * **The one place a track is added or removed.** The grid's invariant — the key
 * set of `text` is exactly the axes, in row-major order (see TableGrid) — is kept
 * here by construction rather than by every caller splicing `text` correctly.
 * Nothing about a box is touched; a state has its box re-derived by
 * reconcileTableBoxWithGrid.
 *
 * @param grid - The grid to rewrite; every other field it carries (a state's box, a doc's style) is carried over untouched
 * @param rows - The rows after the operation, top to bottom; a fresh array, the result keeping the one it is given
 * @param columns - The columns after the operation, left to right; likewise fresh
 * @param cellAt - The cell to put at one position of the **new** grid, given its new row and column indices — which is how a caller says where each old cell went
 * @returns A new object of the same kind as `grid`
 */
export const rebuildTableGrid = <Grid extends TableGrid>(
	grid: Grid,
	rows: TableRowDoc[],
	columns: TableColumnDoc[],
	cellAt: (row: number, column: number) => TableCell,
): Grid => {
	const text: Record<string, TableCell> = {};
	for (let row = 0; row < rows.length; row++) {
		for (let column = 0; column < columns.length; column++) {
			text[tableCellTextSlotId(row, column)] = cellAt(row, column);
		}
	}
	return { ...grid, rows, columns, text };
};
