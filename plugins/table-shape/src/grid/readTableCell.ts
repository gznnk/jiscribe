import { tableCellSlotId } from "../schema/TableDoc";
import type { TableCell } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * One cell of a table, or an empty one for a position the grid claims and
 * `state.text` has no entry at — the same reading mapCellsToSlots gives a
 * document that came up short, so a grid rebuilt from a state can never be left
 * holding `undefined`.
 *
 * @param state - The table to read from; only its `text` is touched, and it is left as it is
 * @param row - 0-based row index into the grid `state` currently holds, not the one being built
 * @param column - 0-based column index, likewise
 * @returns The cell as stored, or a fresh empty one; never a copy of a stored cell, cells being treated as immutable
 */
export const readTableCell = (
	state: TableState,
	row: number,
	column: number,
): TableCell => state.text[tableCellSlotId(row, column)] ?? { text: "" };
