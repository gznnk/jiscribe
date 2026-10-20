import {
	canonicalizeFontWeight,
	defineObjectAiTool,
	textSlotStyleSchema,
} from "@jiscribe/canvas-sdk/tools";
import {
	clearInlineStyleFromRuns,
	type InlineTextStyle,
	TEXT_INLINE_STYLE_KEYS,
} from "@jiscribe/doc";
import { z } from "zod";

import {
	describeTableCellRange,
	resolveTableCellRange,
} from "./resolveTableCellRange";
import { tableCellRangeSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import type { TableCell, TableDoc } from "../schema/TableDoc";

/** The style a cell may carry: its own background, and the typography of its text. */
type TableCellStyle = Omit<TableCell, "text">;

/** The style arguments, named in the refusal of a call that gives none. */
const TABLE_CELL_STYLE_ARG_NAMES = [
	"fill",
	...Object.keys(textSlotStyleSchema),
];

/** table_set_cell_style: a background and typography laid onto every cell of a range. */
export const tableSetCellStyleTool = defineObjectAiTool({
	name: "table_set_cell_style",
	description: [
		"Style a rectangle of cells: each one gets the background and typography given, and keeps what is not given.",
		"This is how a table's text is styled — a table has no shape-wide font settings, so set_style reaches only its own fill and outline, while every cell carries its own typography. A whole row or column is a range one track wide.",
		"The typography reaches all of a cell's text: a property given here replaces what table_set_text_style set for it on part of that text, as set_style does on a shape's text. Use table_set_text_style to style part of a cell's text.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		...tableCellRangeSchema,
		fill: z
			.string()
			.optional()
			.describe(
				'Cell background, any CSS color ("#e3f2fd"). "auto" follows the theme\'s shape surface, and "transparent" lets the table\'s own fill show through.',
			),
		...textSlotStyleSchema,
	},
	apply: (
		table: TableDoc,
		{ row, column, rowCount, columnCount, ...style },
	) => {
		const cellStyle: TableCellStyle = Object.fromEntries(
			Object.entries(style).filter(([, value]) => value !== undefined),
		);
		const styledFields = Object.keys(cellStyle);
		if (styledFields.length === 0) {
			throw new Error(
				`no style given: pass at least one of ${TABLE_CELL_STYLE_ARG_NAMES.join(", ")}`,
			);
		}
		if (cellStyle.fontWeight !== undefined) {
			cellStyle.fontWeight = canonicalizeFontWeight(cellStyle.fontWeight);
		}

		const grid = readTableDocGrid(table);
		const range = resolveTableCellRange(grid, {
			row,
			column,
			rowCount,
			columnCount,
		});
		// A value set on the whole cell has to win over the stretches it was set on
		// part of it, as set_style and the canvas's own cell styling have it.
		const inlineKeys = styledFields.filter(
			(key): key is keyof InlineTextStyle =>
				(TEXT_INLINE_STYLE_KEYS as readonly string[]).includes(key),
		);
		const text = { ...grid.text };
		for (const cellId of range.cellIds) {
			const cell = text[cellId];
			text[cellId] = {
				...cell,
				text: clearInlineStyleFromRuns(cell.text, inlineKeys),
				...cellStyle,
			};
		}
		return {
			doc: writeTableDocGrid(table, { ...grid, text }),
			text: `set ${styledFields.join(", ")} on ${describeTableCellRange(range)}`,
		};
	},
});
