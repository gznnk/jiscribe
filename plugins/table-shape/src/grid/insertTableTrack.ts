import { resolveTableCell } from "./resolveTableCell";
import { rewriteTableGrid } from "./rewriteTableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import type { TableColumnDoc, TableRowDoc } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * The width a newly inserted column copies: that of `sourceColumn` when given,
 * otherwise of the column now standing at `at` — or, for an insertion past the
 * right edge, the last one. Copying rather than defaulting keeps a table of even
 * columns even, and a table of one wide column plus narrow ones from gaining a
 * stray 120px.
 */
const calcInsertedColumnWidth = (
	columns: readonly TableColumnDoc[],
	at: number,
	sourceColumn: number | undefined,
): number => {
	const lastColumn = columns.length - 1;
	const copiedColumn = sourceColumn ?? at;
	return columns[Math.min(Math.max(copiedColumn, 0), lastColumn)].width;
};

/**
 * Inserts one empty track and renumbers the grid behind it. Cell ids are
 * positional, so every cell at or past `at` moves to the next id along the axis;
 * the caller moves any live selection the same way
 * (remapTablePartSelectionForInsert).
 *
 * A new row stores no height, so it is drawn exactly as tall as one empty line
 * asks for. A new column takes the width of `sourceColumn`, so a column inserted
 * on either side of a picked one comes out as wide as the pick. Either
 * way the cells are empty and unstyled: a table's styling sits on its cells, and
 * guessing which neighbour a new one should look like is a decision the caller
 * has not made.
 *
 * @param state - The table to insert into; left untouched, a new state is returned
 * @param axis - Which direction the new track runs in
 * @param at - Where it lands, 0-based; 0 puts it before every existing track and `countTableTracks(state, axis)` after the last. Values outside that range are clamped into it
 * @param sourceColumn - For a column, the existing column (0-based, indexed before the insertion) whose width the new one copies; clamped into the grid, and ignored for a row. Omitted, it is the column standing at `at`, or the last one when `at` is past the right edge — so pass the picked column to insert to its right at its width
 * @returns A new state one track larger, its box grown from the corner the table is drawn from
 */
export const insertTableTrack = (
	state: TableState,
	axis: TableAxis,
	at: number,
	sourceColumn?: number,
): TableState => {
	const insertedAt = Math.min(Math.max(at, 0), countTableTracks(state, axis));

	if (axis === "row") {
		const rows: TableRowDoc[] = [
			...state.rows.slice(0, insertedAt).map((row) => ({ ...row })),
			{},
			...state.rows.slice(insertedAt).map((row) => ({ ...row })),
		];
		const columns = state.columns.map((column) => ({ ...column }));
		return rewriteTableGrid(state, rows, columns, (row, column) => {
			if (row === insertedAt) {
				return { text: "" };
			}
			const sourceRow = row < insertedAt ? row : row - 1;
			return resolveTableCell(state, sourceRow, column);
		});
	}

	const rows = state.rows.map((row) => ({ ...row }));
	const columns: TableColumnDoc[] = [
		...state.columns.slice(0, insertedAt).map((column) => ({ ...column })),
		{ width: calcInsertedColumnWidth(state.columns, insertedAt, sourceColumn) },
		...state.columns.slice(insertedAt).map((column) => ({ ...column })),
	];
	return rewriteTableGrid(state, rows, columns, (row, column) => {
		if (column === insertedAt) {
			return { text: "" };
		}
		const sourceColumn = column < insertedAt ? column : column - 1;
		return resolveTableCell(state, row, sourceColumn);
	});
};
