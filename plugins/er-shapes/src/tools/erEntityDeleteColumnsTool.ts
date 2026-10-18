import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";

import {
	createErEntityColumnCountSchema,
	erEntityColumnSchema,
} from "./erEntityToolSchemas";
import {
	ER_ENTITY_ADDRESSING_NOTE,
	formatErEntityColumnSpan,
	formatErEntityColumnSummary,
	readErEntityPlainText,
} from "./erEntityToolText";
import {
	listErEntityDocColumnIndices,
	requireErEntityColumnRange,
	writeErEntityDocColumns,
} from "./writeErEntityDocColumns";
import type { ErEntityDoc } from "../schema/ErEntityDoc";

/** er_entity_delete_columns: a run of columns removed, the ones behind moving up with their connectors. */
export const erEntityDeleteColumnsTool = defineObjectAiTool({
	name: "er_entity_delete_columns",
	description: [
		"Delete a run of consecutive columns from an ER entity. The columns after them move up, so their indices shrink by count; the box shrinks at the bottom, its top edge staying where it is. Deleting every column is allowed (an entity of none draws one empty row).",
		"Relationship lines attached to a column that moves follow it to its new index, and a line on a deleted column stays on the same side of the box at the height the row stood; the result lists the ends that moved. Use this instead of rewriting columns through set_extra_props, which leaves those lines on the old indices.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {
		column: erEntityColumnSchema,
		count: createErEntityColumnCountSchema("delete"),
	},
	apply: (entity: ErEntityDoc, { column, count }) => {
		const deletedCount = count ?? 1;
		requireErEntityColumnRange(entity, column, deletedCount);
		const isDeleted = (columnIndex: number): boolean =>
			columnIndex >= column && columnIndex < column + deletedCount;
		const deletedNames = entity.columns
			.filter((_column, columnIndex) => isDeleted(columnIndex))
			.map((deletedColumn) => readErEntityPlainText(deletedColumn.name));
		const columnSources = listErEntityDocColumnIndices(entity).filter(
			(columnIndex) => !isDeleted(columnIndex),
		);
		const columns = columnSources.map(
			(sourceIndex) => entity.columns[sourceIndex],
		);
		return {
			...writeErEntityDocColumns(entity, columns, columnSources),
			text: `deleted ${formatErEntityColumnSpan(column, deletedCount)} (${deletedNames.join(", ")}) from erEntity "${entity.id}"; it has ${formatErEntityColumnSummary(columns)}`,
		};
	},
});
