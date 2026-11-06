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
		"Style a rectangle of cells: each gets the background and typography given and keeps the rest.",
		"A table has no shape-wide typography: set_style reaches only its fill and outline, and every cell carries its own.",
		"The typography covers a cell's whole text, replacing what table_set_text_style set on part of it.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		...tableCellRangeSchema,
		fill: z
			.string()
			.optional()
			.describe(
				'Cell background, any CSS color; "auto" follows the theme\'s shape surface, "transparent" shows the table\'s own fill.',
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
