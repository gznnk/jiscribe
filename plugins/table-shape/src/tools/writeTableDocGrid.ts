import { mapTableGridToCells } from "../grid/mapTableGridToCells";
import type { TableGrid } from "../grid/TableGrid";
import type { TableDoc } from "../schema/TableDoc";

/**
 * The document with `grid` written into it as `columns` / `rows` / `cells`, the
 * inverse of readTableDocGrid. Every other field of `doc` is carried over.
 *
 * @param doc - The table the grid was read from; left untouched
 * @param grid - The grid after an operation
 * @returns A new table doc
 */
export const writeTableDocGrid = (
	doc: TableDoc,
	grid: TableGrid,
): TableDoc => ({
	...doc,
	columns: grid.columns,
	rows: grid.rows,
	cells: mapTableGridToCells(grid),
});
