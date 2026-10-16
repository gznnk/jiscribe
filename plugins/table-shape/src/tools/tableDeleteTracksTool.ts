import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import { describeTableExtent } from "./tableResultText";
import { tableAxisSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import { removeTableGridTracks } from "../grid/removeTableGridTracks";
import { countTableTracks } from "../grid/tableTrack";
import type { TableDoc } from "../schema/TableDoc";

/** table_delete_tracks: whole rows or columns gone, the cells behind them moving up or left. */
export const tableDeleteTracksTool = defineObjectAiTool({
	name: "table_delete_tracks",
	description: [
		"Delete whole rows or columns of a table, with everything in their cells. The tracks after them move up (rows) or left (columns) and are renumbered.",
		"A table keeps at least one row and one column, so deleting all of either is refused; to remove the table itself use delete_objects.",
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		axis: tableAxisSchema,
		indices: z
			.array(z.number().int().min(0))
			.min(1)
			.describe(
				"Indices of the tracks to delete, as they stand before the call; in any order.",
			),
	},
	apply: (table: TableDoc, { axis, indices }) => {
		const grid = readTableDocGrid(table);
		const trackCount = countTableTracks(grid, axis);
		const missingIndices = indices.filter((index) => index >= trackCount);
		if (missingIndices.length > 0) {
			throw new Error(
				`the table has no ${axis} ${missingIndices.join(", ")}: it has ${describeTableExtent(grid)}`,
			);
		}
		const deletedIndices = [...new Set(indices)].sort((a, b) => a - b);
		const removed = removeTableGridTracks(grid, axis, deletedIndices);
		if (removed === null) {
			throw new Error(
				`deleting every ${axis} would leave the table empty; a table keeps at least one row and one column. Delete the table itself with delete_objects instead`,
			);
		}
		return {
			doc: writeTableDocGrid(table, removed),
			text: `deleted ${axis}${deletedIndices.length === 1 ? "" : "s"} ${deletedIndices.join(", ")}; the table is now ${describeTableExtent(removed)}`,
		};
	},
});
