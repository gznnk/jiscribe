import type { TableGrid } from "./TableGrid";
import { tableCellTextSlotId } from "../schema/TableDoc";
import type { TableCell } from "../schema/TableDoc";

/**
 * One cell of a table, or an empty one for a position the grid claims and
 * `grid.text` has no entry at — the same reading mapCellsToTextSlots gives a
 * document that came up short, so a rebuilt grid can never be left
 * holding `undefined`.
 *
 * @param grid - The table to read from; only its `text` is touched, and it is left as it is
 * @param row - 0-based row index into the grid as it currently stands, not the one being built
 * @param column - 0-based column index, likewise
 * @returns The cell as stored, or a fresh empty one; never a copy of a stored cell, cells being treated as immutable
 */
export const resolveTableCell = (
	grid: TableGrid,
	row: number,
	column: number,
): TableCell => grid.text[tableCellTextSlotId(row, column)] ?? { text: "" };
