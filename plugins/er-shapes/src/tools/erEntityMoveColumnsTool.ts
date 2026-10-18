import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import {
	createErEntityColumnCountSchema,
	erEntityColumnSchema,
} from "./erEntityToolSchemas";
import {
	ER_ENTITY_ADDRESSING_NOTE,
	formatErEntityColumnSpan,
	formatErEntityColumnSummary,
} from "./erEntityToolText";
import {
	listErEntityDocColumnIndices,
	requireErEntityColumnRange,
	writeErEntityDocColumns,
} from "./writeErEntityDocColumns";
import type { ErEntityDoc } from "../schema/ErEntityDoc";

/** er_entity_move_columns: a run of columns moved to another position, their connectors along. */
export const erEntityMoveColumnsTool = defineObjectAiTool({
	name: "er_entity_move_columns",
	description: [
		"Move a run of consecutive columns of an ER entity to another position, keeping their order; the columns between the old and the new position shift to close the gap. Use it to reorder columns, e.g. to put the primary key first.",
		"Relationship lines attached to every column that moves — the moved ones and the shifted ones — follow it to its new index on their own, and the result lists the ends that moved. Use this instead of rewriting columns through set_extra_props, which leaves those lines on the old indices.",
		ER_ENTITY_ADDRESSING_NOTE,
	].join(" "),
	objectType: "erEntity",
	inputSchema: {
		column: erEntityColumnSchema,
		count: createErEntityColumnCountSchema("move"),
		to: z
			.number()
			.int()
			.min(0)
			.describe(
				"Index the first moved column has after the move: 0 puts the run at the top, the column count minus count at the bottom.",
			),
	},
	apply: (entity: ErEntityDoc, { column, count, to }) => {
		const movedCount = count ?? 1;
		requireErEntityColumnRange(entity, column, movedCount);
		const lastStart = entity.columns.length - movedCount;
		if (to > lastStart) {
			throw new Error(
				`to ${to} is past the end: ${formatErEntityColumnSpan(column, movedCount)} can start at 0 to ${lastStart}`,
			);
		}
		// Refused rather than written back unchanged, which would leave an undo step
		// that takes back nothing
		if (to === column) {
			throw new Error(
				`${formatErEntityColumnSpan(column, movedCount)} already start${movedCount === 1 ? "s" : ""} at ${to}; nothing was changed`,
			);
		}
		const columnSources = listErEntityDocColumnIndices(entity);
		const movedSources = columnSources.splice(column, movedCount);
		columnSources.splice(to, 0, ...movedSources);
		const columns = columnSources.map(
			(sourceIndex) => entity.columns[sourceIndex],
		);
		return {
			...writeErEntityDocColumns(entity, columns, columnSources),
			text: `moved ${formatErEntityColumnSpan(column, movedCount)} of erEntity "${entity.id}" to ${formatErEntityColumnSpan(to, movedCount)}; it has ${formatErEntityColumnSummary(columns)}`,
		};
	},
});
