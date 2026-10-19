import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import {
	describeTableExtent,
	formatTableTrackCount,
	formatTableTrackSpan,
} from "./tableResultText";
import { tableAxisSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { insertTableGridTrack } from "../grid/insertTableGridTrack";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import { countTableTracks } from "../grid/tableTrack";
import type { TableDoc } from "../schema/TableDoc";

/** Most tracks one call inserts, so a stray count cannot build a grid nobody asked for. */
const MAX_INSERTED_TRACKS = 100;

/** table_insert_tracks: empty rows or columns styled as their neighbour, the cells behind them moving along. */
export const tableInsertTracksTool = defineObjectAiTool({
	name: "table_insert_tracks",
	description: [
		"Insert empty rows or columns into a table. The cells at and after the insertion point move down (rows) or right (columns), so their indices grow by count.",
		"The new tracks copy everything but the text from the track standing at `at` (the last one when appending): a column its width, a row its stored height, each cell its fill and text style. So rows appended to a styled body look like the body; restyle them with table_set_cell_style if they should not.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		axis: tableAxisSchema,
		at: z
			.number()
			.int()
			.min(0)
			.describe(
				"Index the first new track takes: 0 inserts before every existing one, the current count (from table_read) appends after the last.",
			),
		count: z
			.number()
			.int()
			.min(1)
			.max(MAX_INSERTED_TRACKS)
			.optional()
			.describe("How many tracks to insert side by side; omit for 1."),
	},
	apply: (table: TableDoc, { axis, at, count }) => {
		const grid = readTableDocGrid(table);
		const trackCount = countTableTracks(grid, axis);
		if (at > trackCount) {
			throw new Error(
				`at ${at} is past the end: the table has ${describeTableExtent(grid)}, so a ${axis} can be inserted at 0 to ${trackCount}`,
			);
		}
		const insertedCount = count ?? 1;
		let inserted = grid;
		for (let index = 0; index < insertedCount; index++) {
			inserted = insertTableGridTrack(inserted, axis, at);
		}
		return {
			doc: writeTableDocGrid(table, inserted),
			text: `inserted ${formatTableTrackCount(insertedCount, axis)} (now ${formatTableTrackSpan(at, insertedCount, axis)}, empty); the table is now ${describeTableExtent(inserted)}`,
		};
	},
});
