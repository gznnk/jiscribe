import { defineObjectAiTool } from "@jiscribe/canvas-sdk/tools";
import { z } from "zod";

import {
	describeTableExtent,
	formatTableColumnWidths,
	formatTableRowHeights,
	TABLE_AUTO_ROW_HEIGHT,
} from "./tableResultText";
import { tableAxisSchema } from "./tableToolSchemas";
import { TABLE_ADDRESSING_NOTE } from "./tableToolText";
import { writeTableDocGrid } from "./writeTableDocGrid";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import type { TableGrid } from "../grid/TableGrid";
import type { TableAxis } from "../grid/tableTrack";
import { countTableTracks } from "../grid/tableTrack";
import {
	TABLE_MIN_COLUMN_WIDTH,
	TABLE_MIN_ROW_HEIGHT,
} from "../schema/TableDoc";
import type { TableDoc } from "../schema/TableDoc";

/** One size the model asked for. */
type TrackSizeEntry = {
	/** The track, 0-based. */
	index: number;
	/** px, or "auto" for a row following its text. */
	size: number | typeof TABLE_AUTO_ROW_HEIGHT;
};

/**
 * Refuses the first entry the axis cannot hold, naming the reason.
 *
 * @throws For an index past the grid, an index named twice, "auto" on a column, and a size under the axis's minimum
 */
const checkTrackSizeEntries = (
	grid: TableGrid,
	axis: TableAxis,
	entries: readonly TrackSizeEntry[],
): void => {
	const trackCount = countTableTracks(grid, axis);
	const seenIndices = new Set<number>();
	for (const { index, size } of entries) {
		if (index >= trackCount) {
			throw new Error(
				`the table has no ${axis} ${index}: it has ${describeTableExtent(grid)}`,
			);
		}
		if (seenIndices.has(index)) {
			throw new Error(`${axis} ${index} is given more than one size`);
		}
		seenIndices.add(index);
		if (size === TABLE_AUTO_ROW_HEIGHT) {
			if (axis === "column") {
				throw new Error(
					`a column has no "auto" width; give column ${index} a width in px, at least ${TABLE_MIN_COLUMN_WIDTH}`,
				);
			}
			continue;
		}
		const minSize =
			axis === "column" ? TABLE_MIN_COLUMN_WIDTH : TABLE_MIN_ROW_HEIGHT;
		if (size < minSize) {
			throw new Error(
				`${axis} ${index} cannot be ${size}px: a ${axis} is at least ${minSize}px`,
			);
		}
	}
};

/** The grid with the sizes written onto fresh track entries. */
const applyTrackSizes = (
	grid: TableGrid,
	axis: TableAxis,
	entries: readonly TrackSizeEntry[],
): TableGrid => {
	const sizeByIndex = new Map(entries.map(({ index, size }) => [index, size]));
	if (axis === "column") {
		return {
			...grid,
			columns: grid.columns.map((column, index) => {
				const size = sizeByIndex.get(index);
				return typeof size === "number" ? { ...column, width: size } : column;
			}),
		};
	}
	return {
		...grid,
		rows: grid.rows.map((row, index) => {
			const size = sizeByIndex.get(index);
			if (size === undefined) {
				return row;
			}
			if (size === TABLE_AUTO_ROW_HEIGHT) {
				const { height: _height, ...autoRow } = row;
				return autoRow;
			}
			return { ...row, height: size };
		}),
	};
};

/** The sizes of one axis as the result states them. */
const describeTrackSizes = (grid: TableGrid, axis: TableAxis): string =>
	axis === "column"
		? `column widths are now ${formatTableColumnWidths(grid.columns)}`
		: `row heights are now ${formatTableRowHeights(grid.rows)}`;

/** table_set_track_sizes: column widths, or row heights (a floor the text may push past). */
export const tableSetTrackSizesTool = defineObjectAiTool({
	name: "table_set_track_sizes",
	description: [
		"Set the widths of columns or the heights of rows. The table's width is its column widths summed, so widening a column widens the table from its left edge.",
		`A column is at least ${TABLE_MIN_COLUMN_WIDTH}px wide. A row's height is a floor: the row is drawn taller when its text needs more, never clipped, and "auto" takes the floor away so the row is exactly as tall as its text.`,
		TABLE_ADDRESSING_NOTE,
	].join(" "),
	objectType: "table",
	inputSchema: {
		axis: tableAxisSchema,
		sizes: z
			.array(
				z
					.object({
						index: z
							.number()
							.int()
							.min(0)
							.describe("The column or row, 0-based."),
						size: z
							.union([z.number(), z.literal(TABLE_AUTO_ROW_HEIGHT)])
							.describe(
								'Width or height in px; "auto" (rows only) makes the row as tall as its text needs.',
							),
					})
					.strict(),
			)
			.min(1)
			.describe(
				"One entry per track to resize; tracks not named keep their size.",
			),
	},
	apply: (table: TableDoc, { axis, sizes }) => {
		const grid = readTableDocGrid(table);
		checkTrackSizeEntries(grid, axis, sizes);
		const resized = applyTrackSizes(grid, axis, sizes);
		return {
			doc: writeTableDocGrid(table, resized),
			text: `resized ${sizes.length} ${axis}${sizes.length === 1 ? "" : "s"}; ${describeTrackSizes(resized, axis)}`,
		};
	},
});
