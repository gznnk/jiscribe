import { calcTableFrameSize } from "../layout/calcTableFrameSize";
import type { TableCell } from "../schema/TableDoc";
import { growTableFromDrawnCorner } from "../state/growTableFromDrawnCorner";
import type { TableState } from "../state/TableState";

/**
 * Empties the named cells and leaves the grid standing — what Delete means over a
 * range of cells, as against over a row grip, where the row itself goes.
 *
 * Only the text is taken. A cell's background and its typography are formatting,
 * and a spreadsheet's Delete key does not reach them; clearing a cell is emptying
 * it, not rebuilding it.
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
	const text: Record<string, TableCell> = { ...state.text };
	let cleared = false;
	for (const cellId of cellIds) {
		const cell = text[cellId];
		if (cell === undefined || cell.text === "") {
			continue;
		}
		text[cellId] = { ...cell, text: "" };
		cleared = true;
	}
	if (!cleared) {
		return null;
	}
	const emptied: TableState = { ...state, text };
	return growTableFromDrawnCorner(emptied, calcTableFrameSize(emptied));
};
