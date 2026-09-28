import { readTableCell } from "./readTableCell";
import { rewriteTableGrid } from "./rewriteTableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import type { TableState } from "../state/TableState";

/** The indices left after the removal, ascending; also the new index → old index map. */
const collectKeptIndices = (
	count: number,
	removed: ReadonlySet<number>,
): number[] => {
	const kept: number[] = [];
	for (let index = 0; index < count; index++) {
		if (!removed.has(index)) {
			kept.push(index);
		}
	}
	return kept;
};

/**
 * Removes whole tracks and renumbers the grid behind them, the mirror of
 * {@link import("./insertTableTrack").insertTableTrack}.
 *
 * **A removal that would empty an axis is refused.** A table of no rows draws
 * nothing and has no cell left to click back into, so the last row — and the last
 * column — cannot be taken away; the caller is told so rather than handed a
 * degenerate grid. Refusing is what `ObjectPartDefinition.delete` spells as null,
 * which leaves the selection standing and the keystroke spent.
 *
 * @param state - The table to remove from; left untouched
 * @param axis - Which direction the removed tracks run in
 * @param indices - The 0-based indices to remove, in any order and with repeats allowed; indices the grid does not have are ignored
 * @returns A new state without those tracks, or null when the removal would leave the axis empty or name nothing the grid has
 */
export const removeTableTracks = (
	state: TableState,
	axis: TableAxis,
	indices: readonly number[],
): TableState | null => {
	const count = countTableTracks(state, axis);
	const removed = new Set(
		indices.filter((index) => index >= 0 && index < count),
	);
	if (removed.size === 0 || count - removed.size < 1) {
		return null;
	}

	const kept = collectKeptIndices(count, removed);
	if (axis === "row") {
		const rows = kept.map((oldRow) => ({ ...state.rows[oldRow] }));
		const columns = state.columns.map((column) => ({ ...column }));
		return rewriteTableGrid(state, rows, columns, (row, column) =>
			readTableCell(state, kept[row], column),
		);
	}

	const rows = state.rows.map((row) => ({ ...row }));
	const columns = kept.map((oldColumn) => ({ ...state.columns[oldColumn] }));
	return rewriteTableGrid(state, rows, columns, (row, column) =>
		readTableCell(state, row, kept[column]),
	);
};
