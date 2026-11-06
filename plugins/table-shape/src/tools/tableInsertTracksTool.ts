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
		"Insert empty rows or columns into a table; the tracks at and after `at` move down or right, their indices growing by count.",
		"The new tracks copy all but the text from the track at `at` (the last one when appending): a column's width, a row's stored height, each cell's fill and text style.",
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
				"Index the first new track takes: 0 inserts before all, the current count (table_read) appends.",
			),
		count: z
			.number()
			.int()
			.min(1)
			.max(MAX_INSERTED_TRACKS)
			.optional()
			.describe("Tracks to insert; 1 when omitted."),
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
