import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";

import {
	describeTableCellRange,
	resolveTableCellRange,
} from "./resolveTableCellRange";
import { tableCellRangeSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { clearTableGridCells } from "../grid/clearTableGridCells";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import type { TableDoc } from "../schema/TableDoc";

/** table_clear_cells: the text of a range of cells emptied, the grid and styling kept. */
export const tableClearCellsTool = defineObjectAiTool({
	name: "table_clear_cells",
	description: [
		"Empty the text of a rectangle of cells. Their fill and typography stay, and so do the rows and columns; to remove those use table_delete_tracks.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: tableCellRangeSchema,
	apply: (table: TableDoc, rangeArgs) => {
		const grid = readTableDocGrid(table);
		const range = resolveTableCellRange(grid, rangeArgs);
		const cleared = clearTableGridCells(grid, range.cellIds);
		// Refused rather than written back unchanged, which would leave an undo step
		// that takes back nothing
		if (cleared === null) {
			throw new Error(
				`${describeTableCellRange(range)} had no text to empty; nothing was changed`,
			);
		}
		return {
			doc: writeTableDocGrid(table, cleared),
			text: `emptied ${describeTableCellRange(range)}`,
		};
	},
});
