import { readTableCell } from "./readTableCell";
import { rewriteTableGrid } from "./rewriteTableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import type { TableColumnDoc, TableRowDoc } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * The column a newly inserted one copies its width from: the column it was put
 * next to, which is the one now standing at `at` — or, for an insertion past the
 * right edge, the last one. Copying rather than defaulting keeps a table of even
 * columns even, and a table of one wide column plus narrow ones from gaining a
 * stray 120px.
 */
const resolveInsertedColumnWidth = (
	columns: readonly TableColumnDoc[],
	at: number,
): number => columns[Math.min(at, columns.length - 1)].width;

/**
 * Inserts one empty track and renumbers the grid behind it. Cell ids are
 * positional, so every cell at or past `at` moves to the next id along the axis;
 * the caller moves any live selection the same way
 * (remapTablePartSelectionForInsert).
 *
 * A new row stores no height, so it is drawn exactly as tall as one empty line
 * asks for. A new column takes the width of the column it was put next to. Either
 * way the cells are empty and unstyled: a table's styling sits on its cells, and
 * guessing which neighbour a new one should look like is a decision the caller
 * has not made.
 *
 * @param state - The table to insert into; left untouched, a new state is returned
 * @param axis - Which direction the new track runs in
 * @param at - Where it lands, 0-based; 0 puts it before every existing track and `countTableTracks(state, axis)` after the last. Values outside that range are clamped into it
 * @returns A new state one track larger, its box grown from the corner the table is drawn from
 */
export const insertTableTrack = (
	state: TableState,
	axis: TableAxis,
	at: number,
): TableState => {
	const insertedAt = Math.min(Math.max(at, 0), countTableTracks(state, axis));

	if (axis === "row") {
		const rows: TableRowDoc[] = [
			...state.rows.slice(0, insertedAt).map((row) => ({ ...row })),
			{},
			...state.rows.slice(insertedAt).map((row) => ({ ...row })),
		];
		const columns = state.columns.map((column) => ({ ...column }));
		return rewriteTableGrid(state, rows, columns, (row, column) =>
			row === insertedAt
				? { text: "" }
				: readTableCell(state, row < insertedAt ? row : row - 1, column),
		);
	}

	const rows = state.rows.map((row) => ({ ...row }));
	const columns: TableColumnDoc[] = [
		...state.columns.slice(0, insertedAt).map((column) => ({ ...column })),
		{ width: resolveInsertedColumnWidth(state.columns, insertedAt) },
		...state.columns.slice(insertedAt).map((column) => ({ ...column })),
	];
	return rewriteTableGrid(state, rows, columns, (row, column) =>
		column === insertedAt
			? { text: "" }
			: readTableCell(state, row, column < insertedAt ? column : column - 1),
	);
};
