import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { richTextToPlain, TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import {
	describeTableExtent,
	formatTableColumnWidths,
	formatTableRowHeights,
} from "./tableResultText";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import { resolveTableCell } from "../grid/resolveTableCell";
import type { TableGrid } from "../grid/TableGrid";
import type { TableCell, TableDoc } from "../schema/TableDoc";

/** The fields of a cell besides its text, in the order they are listed. */
const TABLE_CELL_STYLE_FIELDS = ["fill", ...TEXT_SLOT_STYLE_KEYS] as const;

/** One cell as a line of the listing reads it: its text quoted, then what it sets. */
const describeCell = (cell: TableCell): string => {
	const quotedText = JSON.stringify(richTextToPlain(cell.text));
	const styleEntries = TABLE_CELL_STYLE_FIELDS.flatMap((field) =>
		cell[field] === undefined ? [] : [`${field}=${String(cell[field])}`],
	);
	const runsNote = typeof cell.text === "string" ? [] : ["styled runs"];
	const notes = [...styleEntries, ...runsNote];
	return notes.length === 0
		? quotedText
		: `${quotedText} {${notes.join(", ")}}`;
};

/** The listing table_read answers with. */
const formatTableListing = (tableId: string, grid: TableGrid): string => {
	const rowLines = grid.rows.map((_row, row) => {
		const cells = grid.columns.map((_column, column) =>
			describeCell(resolveTableCell(grid, row, column)),
		);
		return `row ${row}: ${cells.join(" | ")}`;
	});
	return [
		`table "${tableId}": ${describeTableExtent(grid)}`,
		`column widths: ${formatTableColumnWidths(grid.columns)}`,
		`row heights: ${formatTableRowHeights(grid.rows)}`,
		...rowLines,
	].join("\n");
};

/** table_read: the grid's extent, track sizes and every cell, without writing anything. */
export const tableReadTool = defineObjectAiTool({
	name: "table_read",
	description: [
		"Read a table: its extent, column widths, row heights and every cell's text, row by row with cells separated by |, a styled cell followed by what it sets in {}.",
		"Call it before editing a table you did not just build, to know its size and what each cell holds.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {},
	read: (table: TableDoc) =>
		formatTableListing(table.id, readTableDocGrid(table)),
});
