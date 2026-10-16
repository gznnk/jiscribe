import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import { rebuildTableGrid } from "./rebuildTableGrid";
import { resolveTableCell } from "./resolveTableCell";
import type { TableGrid } from "./TableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import type { TableCell } from "../schema/TableDoc";

/**
 * An empty cell styled as `sourceCell` is: its `fill` and every typography field
 * it sets, never its text. Only the fields actually set are copied, so the new
 * cell gains no `undefined`-valued keys and still folds to bare text on save when
 * the source carried nothing but text (mapTableGridToCells).
 */
const createEmptyCellStyledAs = (sourceCell: TableCell): TableCell => {
	const emptyCell: TableCell = { text: "" };
	for (const key of TEXT_SLOT_STYLE_KEYS) {
		if (sourceCell[key] !== undefined) {
			Object.assign(emptyCell, { [key]: sourceCell[key] });
		}
	}
	if (sourceCell.fill !== undefined) {
		emptyCell.fill = sourceCell.fill;
	}
	return emptyCell;
};

/**
 * Inserts one empty track and renumbers the grid behind it. Cell ids are
 * positional, so every cell at or past `at` moves to the next id along the axis;
 * the caller moves any live selection the same way
 * (remapTablePartSelectionForInsert). The box, where the grid has one, is left
 * alone (insertTableTrack re-derives a state's).
 *
 * The new track copies everything about `sourceIndex` but its text: a column its
 * width, a row its stored height, and each new cell the `fill` and typography of
 * the cell beside it in that track. So a track inserted on either side of a
 * picked one looks like the pick, and a table of even columns stays even.
 *
 * @param grid - The table to insert into; left untouched, a new object of its kind is returned
 * @param axis - Which direction the new track runs in
 * @param at - Where it lands, 0-based; 0 puts it before every existing track and `countTableTracks(grid, axis)` after the last. Values outside that range are clamped into it
 * @param sourceIndex - The existing track along `axis` (0-based, indexed before the insertion) the new one copies; clamped into the grid. Omitted, it is the track standing at `at`, or the last one when `at` is past the end — so pass the picked track to insert after it looking like it
 * @returns A new grid one track larger
 */
export const insertTableGridTrack = <Grid extends TableGrid>(
	grid: Grid,
	axis: TableAxis,
	at: number,
	sourceIndex?: number,
): Grid => {
	const trackCount = countTableTracks(grid, axis);
	const insertedAt = Math.min(Math.max(at, 0), trackCount);
	const copiedIndex = Math.min(
		Math.max(sourceIndex ?? insertedAt, 0),
		trackCount - 1,
	);

	if (axis === "row") {
		const rows = [
			...grid.rows.slice(0, insertedAt),
			grid.rows[copiedIndex],
			...grid.rows.slice(insertedAt),
		].map((row) => ({ ...row }));
		const columns = grid.columns.map((column) => ({ ...column }));
		return rebuildTableGrid(grid, rows, columns, (row, column) => {
			if (row === insertedAt) {
				return createEmptyCellStyledAs(
					resolveTableCell(grid, copiedIndex, column),
				);
			}
			const sourceRow = row < insertedAt ? row : row - 1;
			return resolveTableCell(grid, sourceRow, column);
		});
	}

	const rows = grid.rows.map((row) => ({ ...row }));
	const columns = [
		...grid.columns.slice(0, insertedAt),
		grid.columns[copiedIndex],
		...grid.columns.slice(insertedAt),
	].map((column) => ({ ...column }));
	return rebuildTableGrid(grid, rows, columns, (row, column) => {
		if (column === insertedAt) {
			return createEmptyCellStyledAs(resolveTableCell(grid, row, copiedIndex));
		}
		const sourceColumn = column < insertedAt ? column : column - 1;
		return resolveTableCell(grid, row, sourceColumn);
	});
};
