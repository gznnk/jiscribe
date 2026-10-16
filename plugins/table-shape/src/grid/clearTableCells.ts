import { clearTableGridCells } from "./clearTableGridCells";
import { fitTableBoxToGrid } from "../state/fitTableBoxToGrid";
import type { TableState } from "../state/TableState";

/**
 * Empties the named cells of a table on the canvas ({@link clearTableGridCells}) —
 * what Delete means over a range of cells, as against over a row grip, where the
 * row itself goes.
 *
 * The box is re-derived: a cleared cell may have been the tallest of its row, and
 * the table follows its content down as readily as up.
 *
 * Registered as the `delete` of the table's `"textSlot"` part (see
 * {@link import("../definition").tableDefinition}), which is what the Delete key
 * reaches when the selection is a range of cells.
 *
 * @param state - The table to clear in; left untouched
 * @param cellIds - The cells to empty, as `state.text` keys them; ids the grid has no cell at are ignored
 * @returns A new state with those cells empty, or null when every one of them was empty already — which is the refusal that leaves the selection standing
 */
export const clearTableCells = (
	state: TableState,
	cellIds: readonly string[],
): TableState | null => {
	const cleared = clearTableGridCells(state, cellIds);
	return cleared === null ? null : fitTableBoxToGrid(cleared);
};
