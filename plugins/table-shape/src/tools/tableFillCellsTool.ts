import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import { describeTableExtent, formatTableTrackCount } from "./tableResultText";
import { tableCellOriginSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { insertTableGridTrack } from "../grid/insertTableGridTrack";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import { resolveTableCell } from "../grid/resolveTableCell";
import type { TableGrid } from "../grid/TableGrid";
import type { TableAxis } from "../grid/tableTrack";
import { countTableTracks } from "../grid/tableTrack";
import { tableCellTextSlotId } from "../schema/TableDoc";
import type { TableDoc } from "../schema/TableDoc";

/** The grid with tracks appended along `axis` until it holds `neededCount`. */
const growTableGrid = (
	grid: TableGrid,
	axis: TableAxis,
	neededCount: number,
): TableGrid => {
	let grown = grid;
	while (countTableTracks(grown, axis) < neededCount) {
		grown = insertTableGridTrack(grown, axis, countTableTracks(grown, axis));
	}
	return grown;
};

/** table_fill_cells: a block of text written in from one cell, styling kept. */
export const tableFillCellsTool = defineObjectAiTool({
	name: "table_fill_cells",
	description: [
		"Write the text of a block of cells in one call: values[i][j] goes into cell [row + i, column + j]. Rows of values may differ in length; a cell values does not reach is left as it is.",
		"Each written cell keeps its fill and typography and has its text replaced (plain text; \\n breaks a line).",
		"A block reaching past the last row or column is refused unless grow is true, which appends the rows and columns it needs.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		...tableCellOriginSchema,
		values: z
			.array(z.array(z.string()).min(1))
			.min(1)
			.describe(
				'The texts, one array per row from the top, one string per cell from the left; "" empties a cell.',
			),
		grow: z
			.boolean()
			.optional()
			.describe(
				"Append the rows and columns the block needs instead of refusing it; omit or false to refuse.",
			),
	},
	apply: (table: TableDoc, { row, column, values, grow }) => {
		const grid = readTableDocGrid(table);
		const neededRowCount = row + values.length;
		const neededColumnCount =
			column + Math.max(...values.map((rowValues) => rowValues.length));
		const isOverflowing =
			neededRowCount > grid.rows.length ||
			neededColumnCount > grid.columns.length;
		if (isOverflowing && grow !== true) {
			throw new Error(
				`the values reach row ${neededRowCount - 1} and column ${neededColumnCount - 1}, past the table, which has ${describeTableExtent(grid)}; pass grow: true to append what they need, or insert tracks with table_insert_tracks first`,
			);
		}
		if (row > grid.rows.length || column > grid.columns.length) {
			throw new Error(
				`cell [${row},${column}] does not border the table, which has ${describeTableExtent(grid)}; grow appends tracks after the last one and does not leave a gap`,
			);
		}

		const grown = growTableGrid(
			growTableGrid(grid, "row", neededRowCount),
			"column",
			neededColumnCount,
		);
		const text = { ...grown.text };
		let writtenCount = 0;
		values.forEach((rowValues, rowOffset) => {
			rowValues.forEach((value, columnOffset) => {
				const targetRow = row + rowOffset;
				const targetColumn = column + columnOffset;
				text[tableCellTextSlotId(targetRow, targetColumn)] = {
					...resolveTableCell(grown, targetRow, targetColumn),
					text: value,
				};
				writtenCount++;
			});
		});
		const filled: TableGrid = { ...grown, text };

		const addedRowCount = grown.rows.length - grid.rows.length;
		const addedColumnCount = grown.columns.length - grid.columns.length;
		const addedNotes = [
			...(addedRowCount > 0
				? [formatTableTrackCount(addedRowCount, "row")]
				: []),
			...(addedColumnCount > 0
				? [formatTableTrackCount(addedColumnCount, "column")]
				: []),
		];
		const addedText =
			addedNotes.length === 0 ? "" : `, appending ${addedNotes.join(" and ")}`;
		return {
			doc: writeTableDocGrid(table, filled),
			text: `wrote ${writtenCount} cell${writtenCount === 1 ? "" : "s"} from [${row},${column}] to [${neededRowCount - 1},${neededColumnCount - 1}]${addedText}; the table is now ${describeTableExtent(filled)}`,
		};
	},
});
