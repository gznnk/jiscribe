import { rebuildTableGrid } from "./rebuildTableGrid";
import { resolveTableCell } from "./resolveTableCell";
import type { TableGrid } from "./TableGrid";
import { countTableTracks } from "./tableTrack";
import type { TableAxis } from "./tableTrack";

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
 * {@link import("./insertTableGridTrack").insertTableGridTrack}. The box, where the
 * grid has one, is left alone (a state's is re-derived by reconcileTableBoxWithGrid).
 *
 * **A removal that would empty an axis is refused.** A table of no rows draws
 * nothing and has no cell left to click back into, so the last row — and the last
 * column — cannot be taken away; the caller is told so rather than handed a
 * degenerate grid.
 *
 * @param grid - The table to remove from; left untouched
 * @param axis - Which direction the removed tracks run in
 * @param indices - The 0-based indices to remove, in any order and with repeats allowed; indices the grid does not have are ignored
 * @returns A new grid without those tracks, or null when the removal would leave the axis empty or name nothing the grid has
 */
export const removeTableGridTracks = <Grid extends TableGrid>(
	grid: Grid,
	axis: TableAxis,
	indices: readonly number[],
): Grid | null => {
	const count = countTableTracks(grid, axis);
	const removed = new Set(
		indices.filter((index) => index >= 0 && index < count),
	);
	if (removed.size === 0 || count - removed.size < 1) {
		return null;
	}

	const kept = collectKeptIndices(count, removed);
	if (axis === "row") {
		const rows = kept.map((oldRow) => ({ ...grid.rows[oldRow] }));
		const columns = grid.columns.map((column) => ({ ...column }));
		return rebuildTableGrid(grid, rows, columns, (row, column) =>
			resolveTableCell(grid, kept[row], column),
		);
	}

	const rows = grid.rows.map((row) => ({ ...row }));
	const columns = kept.map((oldColumn) => ({ ...grid.columns[oldColumn] }));
	return rebuildTableGrid(grid, rows, columns, (row, column) =>
		resolveTableCell(grid, row, kept[column]),
	);
};
