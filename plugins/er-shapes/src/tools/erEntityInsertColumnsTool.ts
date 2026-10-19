import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import {
	ER_ENTITY_ADDRESSING_NOTE,
	formatErEntityColumnCount,
	formatErEntityColumnSpan,
	formatErEntityColumnSummary,
} from "./erEntityToolText";
import {
	listErEntityDocColumnIndices,
	requireSingleLineText,
	writeErEntityDocColumns,
} from "./writeErEntityDocColumns";
import type { ErEntityColumnSource } from "../columns/ErEntityColumnSource";
import type { ErEntityColumnDoc, ErEntityDoc } from "../schema/ErEntityDoc";

/** Most columns one call inserts, so a stray argument cannot build a table nobody asked for. */
const MAX_INSERTED_COLUMNS = 100;

/** The column one argument entry asks for, an empty key or type left out as the canvas leaves it out. */
const buildInsertedColumn = (
	columnArg: { key?: string; name: string; type?: string },
	argIndex: number,
): ErEntityColumnDoc => {
	requireSingleLineText(columnArg.name, `columns[${argIndex}].name`);
	for (const field of ["key", "type"] as const) {
		const text = columnArg[field];
		if (text !== undefined) {
			requireSingleLineText(text, `columns[${argIndex}].${field}`);
		}
	}
	return {
		...(columnArg.key !== undefined &&
			columnArg.key !== "" && { key: columnArg.key }),
		name: columnArg.name,
		...(columnArg.type !== undefined &&
			columnArg.type !== "" && { type: columnArg.type }),
	};
};

/** er_entity_insert_columns: new columns at one position, the columns behind them and their connectors moving down. */
export const erEntityInsertColumnsTool = defineObjectAiTool({
	name: "er_entity_insert_columns",
	description: [
		"Insert columns into an ER entity at one position, or append them. The columns at and after the position move down, so their indices grow by the number inserted; the box grows at the bottom, its top edge staying where it is.",
		"Relationship lines attached to a column that moves follow it to its new index on their own, and the result lists the ends that moved. Use this instead of rewriting columns through set_extra_props, which leaves those lines on the old indices.",
		"New columns take the default typography; style them with er_entity_set_text_style.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {
		at: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe(
				"Index the first new column takes: 0 inserts above every existing one, the current count appends. Omit to append.",
			),
		columns: z
			.array(
				z
					.object({
						key: z
							.string()
							.optional()
							.describe(
								'Key gutter text, drawn as written ("PK", "FK", "PK, FK", "UK"); omit or "" for none.',
							),
						name: z.string().describe("Column name."),
						type: z
							.string()
							.optional()
							.describe(
								'Column type, nullability in SQL words ("varchar(80) null"); omit or "" for none.',
							),
					})
					.strict(),
			)
			.min(1)
			.max(MAX_INSERTED_COLUMNS)
			.describe(
				"The new columns, top to bottom; each text is one line, no newline.",
			),
	},
	apply: (entity: ErEntityDoc, { at, columns: columnArgs }) => {
		const columnCount = entity.columns.length;
		const insertAt = at ?? columnCount;
		if (insertAt > columnCount) {
			throw new Error(
				`at ${insertAt} is past the end: entity "${entity.id}" has ${formatErEntityColumnCount(columnCount)}, so columns can be inserted at 0 to ${columnCount}`,
			);
		}
		const insertedColumns = columnArgs.map(buildInsertedColumn);
		const columns = [...entity.columns];
		columns.splice(insertAt, 0, ...insertedColumns);
		const columnSources: ErEntityColumnSource[] =
			listErEntityDocColumnIndices(entity);
		columnSources.splice(
			insertAt,
			0,
			...insertedColumns.map((): ErEntityColumnSource => null),
		);
		return {
			...writeErEntityDocColumns(entity, columns, columnSources),
			text: `inserted ${formatErEntityColumnCount(insertedColumns.length)} into erEntity "${entity.id}" (now ${formatErEntityColumnSpan(insertAt, insertedColumns.length)}); it has ${formatErEntityColumnSummary(columns)}`,
		};
	},
});
