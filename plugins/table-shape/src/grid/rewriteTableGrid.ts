import { calcTableFrameSize } from "../layout/calcTableFrameSize";
import { tableCellSlotId } from "../schema/TableDoc";
import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";
import { growTableFromDrawnCorner } from "../state/growTableFromDrawnCorner";
import type { TableState } from "../state/TableState";

/**
 * The state with a new grid on it: the tracks as given, `text` rebuilt from
 * `readCell` so its keys are exactly `tableCellSlotIds(rows.length,
 * columns.length)`, and the box re-derived from the result.
 *
 * **The one place a track is added or removed.** The grid's invariant — the key
 * set of `text` is exactly the axes, in row-major order (see TableState) — is
 * kept here by construction rather than by every caller splicing `text`
 * correctly.
 *
 * The box is derived here rather than left to the type's `contentResizer`,
 * because that resizer reads a width the columns do not sum to as an outer resize
 * and would squeeze the new column back out of the table (see
 * resizeTableStateToContent). Having already grown the box from the drawn corner,
 * the pass the reducer runs next finds the two agreeing and returns the state
 * untouched.
 *
 * @param state - The table to rewrite; its transform, style and id are carried over, and the corner it is drawn from is what the new box is grown from
 * @param rows - The rows after the operation, top to bottom; a fresh array, the state keeping the one it is given
 * @param columns - The columns after the operation, left to right; likewise fresh
 * @param readCell - The cell to put at one position of the **new** grid, given its new row and column indices — which is how a caller says where each old cell went
 * @returns A new state whose box matches the new grid
 */
export const rewriteTableGrid = (
	state: TableState,
	rows: TableRowDoc[],
	columns: TableColumnDoc[],
	readCell: (row: number, column: number) => TableCell,
): TableState => {
	const text: Record<string, TableCell> = {};
	for (let row = 0; row < rows.length; row++) {
		for (let column = 0; column < columns.length; column++) {
			text[tableCellSlotId(row, column)] = readCell(row, column);
		}
	}
	const rewritten: TableState = { ...state, rows, columns, text };
	return growTableFromDrawnCorner(rewritten, calcTableFrameSize(rewritten));
};
