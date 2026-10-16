import { rebuildTableGrid } from "./rebuildTableGrid";
import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";
import { fitTableBoxToGrid } from "../state/fitTableBoxToGrid";
import type { TableState } from "../state/TableState";

/**
 * The state with a new grid on it ({@link rebuildTableGrid}) and the box re-derived
 * from the result (fitTableBoxToGrid).
 *
 * @param state - The table to rewrite; its transform, style and id are carried over, and the corner it is drawn from is where the new box is anchored
 * @param rows - The rows after the operation, top to bottom; a fresh array, the state keeping the one it is given
 * @param columns - The columns after the operation, left to right; likewise fresh
 * @param cellAt - The cell to put at one position of the **new** grid, given its new row and column indices — which is how a caller says where each old cell went
 * @returns A new state whose box matches the new grid
 */
export const rewriteTableGrid = (
	state: TableState,
	rows: TableRowDoc[],
	columns: TableColumnDoc[],
	cellAt: (row: number, column: number) => TableCell,
): TableState =>
	fitTableBoxToGrid(rebuildTableGrid(state, rows, columns, cellAt));
