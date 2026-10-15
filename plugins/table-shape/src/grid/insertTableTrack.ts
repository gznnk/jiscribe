import { TEXT_SLOT_STYLE_KEYS } from "@jiscribe/doc";

import { resolveTableCell } from "./resolveTableCell";
import { rewriteTableGrid } from "./rewriteTableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import type { TableCell } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * An empty cell styled as `sourceCell` is: its `fill` and every typography field
 * it sets, never its text. Only the fields actually set are copied, so the new
 * cell gains no `undefined`-valued keys and still folds to bare text on save when
 * the source carried nothing but text (TableMapper).
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
 * (remapTablePartSelectionForInsert).
 *
 * The new track copies everything about `sourceIndex` but its text: a column its
 * width, a row its stored height, and each new cell the `fill` and typography of
 * the cell beside it in that track. So a track inserted on either side of a
 * picked one looks like the pick, and a table of even columns stays even.
 *
 * @param state - The table to insert into; left untouched, a new state is returned
 * @param axis - Which direction the new track runs in
 * @param at - Where it lands, 0-based; 0 puts it before every existing track and `countTableTracks(state, axis)` after the last. Values outside that range are clamped into it
 * @param sourceIndex - The existing track along `axis` (0-based, indexed before the insertion) the new one copies; clamped into the grid. Omitted, it is the track standing at `at`, or the last one when `at` is past the end — so pass the picked track to insert after it looking like it
 * @returns A new state one track larger, its box grown from the corner the table is drawn from
 */
export const insertTableTrack = (
	state: TableState,
	axis: TableAxis,
	at: number,
	sourceIndex?: number,
): TableState => {
	const trackCount = countTableTracks(state, axis);
	const insertedAt = Math.min(Math.max(at, 0), trackCount);
	const copiedIndex = Math.min(
		Math.max(sourceIndex ?? insertedAt, 0),
		trackCount - 1,
	);

	if (axis === "row") {
		const rows = [
			...state.rows.slice(0, insertedAt),
			state.rows[copiedIndex],
			...state.rows.slice(insertedAt),
		].map((row) => ({ ...row }));
		const columns = state.columns.map((column) => ({ ...column }));
		return rewriteTableGrid(state, rows, columns, (row, column) => {
			if (row === insertedAt) {
				return createEmptyCellStyledAs(
					resolveTableCell(state, copiedIndex, column),
				);
			}
			const sourceRow = row < insertedAt ? row : row - 1;
			return resolveTableCell(state, sourceRow, column);
		});
	}

	const rows = state.rows.map((row) => ({ ...row }));
	const columns = [
		...state.columns.slice(0, insertedAt),
		state.columns[copiedIndex],
		...state.columns.slice(insertedAt),
	].map((column) => ({ ...column }));
	return rewriteTableGrid(state, rows, columns, (row, column) => {
		if (column === insertedAt) {
			return createEmptyCellStyledAs(resolveTableCell(state, row, copiedIndex));
		}
		const sourceColumn = column < insertedAt ? column : column - 1;
		return resolveTableCell(state, row, sourceColumn);
	});
};
