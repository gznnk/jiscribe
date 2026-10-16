import type { TableGrid } from "./TableGrid";
import { mapCellsToTextSlots } from "../schema/mapCellsToTextSlots";
import type { TableDoc } from "../schema/TableDoc";

/**
 * The grid a table document writes, in the keyed form the grid operations take:
 * fresh track entries, and the cells keyed by tableCellTextSlotId
 * ({@link mapCellsToTextSlots}). The inverse is mapTableGridToCells.
 *
 * @param doc - The table to read; left untouched, and a grid shorter than its axes reads as empty cells
 * @returns A grid sharing no track entry with `doc`, so two grids read from the same doc defaults share none
 */
export const readTableDocGrid = (
	doc: Pick<TableDoc, "columns" | "rows" | "cells">,
): TableGrid => ({
	columns: doc.columns.map((column) => ({ ...column })),
	rows: doc.rows.map((row) => ({ ...row })),
	text: mapCellsToTextSlots(doc.cells, doc.rows.length, doc.columns.length),
});
