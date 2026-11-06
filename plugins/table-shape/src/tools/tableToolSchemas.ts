// Argument schemas the table tools share, so a cell range and an axis are written
// the same way in every one of them.

import { z } from "zod";

/** Which kind of track a call acts on; the same word the grid operations take (TableAxis). */
export const tableAxisSchema = z
	.enum(["row", "column"])
	.describe('"row" for horizontal bands of cells, "column" for vertical.');

/** The top-left cell a call starts at; table_fill_cells takes this alone. */
export const tableCellOriginSchema = {
	row: z.number().int().min(0).describe("Row of the top-left cell."),
	column: z.number().int().min(0).describe("Column of the top-left cell."),
};

/** A rectangle of cells: the origin plus how far it reaches. */
export const tableCellRangeSchema = {
	...tableCellOriginSchema,
	rowCount: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			"Rows spanned downwards from row, inside the table; 1 when omitted.",
		),
	columnCount: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			"Columns spanned rightwards from column, inside the table; 1 when omitted.",
		),
};
