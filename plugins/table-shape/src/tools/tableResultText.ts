// How the table tools' results name extents and runs of tracks, so every result
// counts and spans them the same way.

import type { TableAxis } from "../grid/tableTrack";
import type { TableColumnDoc, TableRowDoc } from "../schema/TableDoc";

/** How a row storing no height is written, in results and in table_set_track_sizes. */
export const TABLE_AUTO_ROW_HEIGHT = "auto";

/**
 * A count of tracks in words, singular where it is one.
 *
 * @param count - How many tracks
 * @param axis - Which kind they are
 * @returns e.g. "1 row", "3 columns"
 */
export const formatTableTrackCount = (count: number, axis: TableAxis): string =>
	`${count} ${axis}${count === 1 ? "" : "s"}`;

/**
 * A run of consecutive tracks in words.
 *
 * @param start - The first track, 0-based
 * @param count - How many, at least 1
 * @param axis - Which kind they are
 * @returns e.g. "row 2", "columns 0-3"
 */
export const formatTableTrackSpan = (
	start: number,
	count: number,
	axis: TableAxis,
): string =>
	count === 1 ? `${axis} ${start}` : `${axis}s ${start}-${start + count - 1}`;

/**
 * The extent of a grid as the tool results state it, with the last index of each
 * axis so the model can address the last track without counting.
 *
 * @param grid - The grid's two axes, each at least one track long
 * @returns e.g. "3 rows (0-2) x 2 columns (0-1)"
 */
export const describeTableExtent = (grid: {
	rows: readonly unknown[];
	columns: readonly unknown[];
}): string =>
	`${formatTableTrackCount(grid.rows.length, "row")} (0-${grid.rows.length - 1}) x ${formatTableTrackCount(grid.columns.length, "column")} (0-${grid.columns.length - 1})`;

/**
 * The column widths as a result lists them.
 *
 * @param columns - The columns, left to right
 * @returns e.g. "80, 120 px"
 */
export const formatTableColumnWidths = (
	columns: readonly TableColumnDoc[],
): string => `${columns.map((column) => column.width).join(", ")} px`;

/**
 * The row heights as a result lists them, saying what a number and "auto" mean.
 *
 * @param rows - The rows, top to bottom
 * @returns e.g. "auto, 40, auto (px; auto = ...)"
 */
export const formatTableRowHeights = (rows: readonly TableRowDoc[]): string =>
	`${rows.map((row) => row.height ?? TABLE_AUTO_ROW_HEIGHT).join(", ")} (px; ${TABLE_AUTO_ROW_HEIGHT} = as tall as the text needs, a number = at least that tall)`;
