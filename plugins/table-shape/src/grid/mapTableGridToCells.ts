import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import type { TableGrid } from "./TableGrid";
import { tableCellTextSlotId } from "../schema/TableDoc";
import type { TableCell, TableCellDoc } from "../schema/TableDoc";

/**
 * Whether a cell carries nothing but its text, and so may be written back as that
 * text alone. Both halves matter: a `fill` is the type's own field on a slot, and
 * the style fields are the ones a cell shares with every other slot.
 */
const isTextOnlyCell = (cell: TableCell): boolean =>
	cell.fill === undefined &&
	TEXT_SLOT_STYLE_KEYS.every((key) => cell[key] === undefined);

/**
 * The cells of a grid as a document writes them, `[row][column]`: the inverse of
 * mapCellsToTextSlots, folding every unstyled cell to its text so a plain grid
 * stays plain in the file.
 *
 * @param grid - The grid to fold; its axes decide the extent, and a position `text` has no entry at is written as an empty cell
 * @returns A fresh grid of cells, each styled one a copy of the stored cell
 */
export const mapTableGridToCells = (grid: TableGrid): TableCellDoc[][] => {
	const cells: TableCellDoc[][] = [];
	for (let row = 0; row < grid.rows.length; row++) {
		const rowCells: TableCellDoc[] = [];
		for (let column = 0; column < grid.columns.length; column++) {
			const cell = grid.text[tableCellTextSlotId(row, column)];
			if (cell === undefined) {
				rowCells.push("");
				continue;
			}
			rowCells.push(isTextOnlyCell(cell) ? cell.text : { ...cell });
		}
		cells.push(rowCells);
	}
	return cells;
};
