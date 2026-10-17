import type { TableGrid } from "./TableGrid";
import type { TableCell } from "../schema/TableDoc";

/**
 * Empties the named cells and leaves the grid standing. Only the text is taken: a
 * cell's background and its typography are formatting, and a spreadsheet's Delete
 * key does not reach them; clearing a cell is emptying it, not rebuilding it. The
 * box, where the grid has one, is left alone (a state's is re-derived by
 * reconcileTableBoxWithGrid).
 *
 * @param grid - The table to clear in; left untouched
 * @param cellIds - The cells to empty, as `grid.text` keys them; ids the grid has no cell at are ignored
 * @returns A new grid with those cells empty, or null when every one of them was empty already
 */
export const clearTableGridCells = <Grid extends TableGrid>(
	grid: Grid,
	cellIds: readonly string[],
): Grid | null => {
	const text: Record<string, TableCell> = { ...grid.text };
	let cleared = false;
	for (const cellId of cellIds) {
		const cell = text[cellId];
		if (cell === undefined || cell.text === "") {
			continue;
		}
		text[cellId] = { ...cell, text: "" };
		cleared = true;
	}
	return cleared ? { ...grid, text } : null;
};
