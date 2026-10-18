import {
	listErEntityColumnIndices,
	rewriteErEntityColumns,
} from "./rewriteErEntityColumns";
import type { ErEntityColumnSource } from "./rewriteErEntityColumns";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The column order a removal leaves (rewriteErEntityColumns): the entity's
 * columns without the named ones, the ones behind them moving up.
 *
 * @param state - The entity to remove from; read only
 * @param columnIndices - 0-based in declared order, in any order and with repeats allowed; indices the entity does not have are ignored
 * @returns One entry per remaining column, or null when the indices name no column the entity has
 */
export const listErEntityColumnSourcesForRemoval = (
	state: ErEntityState,
	columnIndices: readonly number[],
): ErEntityColumnSource[] | null => {
	const columnSources = listErEntityColumnIndices(state);
	const removed = new Set(
		columnIndices.filter(
			(columnIndex) => columnIndex >= 0 && columnIndex < columnSources.length,
		),
	);
	if (removed.size === 0) {
		return null;
	}
	return columnSources.filter((columnIndex) => !removed.has(columnIndex));
};

/**
 * Removes whole columns and renumbers the ones behind them. Removing every
 * column is allowed: an entity of none draws one empty row, and a column is
 * added back from the menu's "Add at Bottom". The connectors attached to the
 * columns are rewritten by the canvas-side rewrite (rewriteErEntityColumnsOnCanvas),
 * which the commands go through; this entity-only form is what the part kind's
 * `delete` can reach, and leaves them on the ids they name.
 *
 * @param state - The entity to remove from; left untouched
 * @param columnIndices - 0-based in declared order, in any order and with repeats allowed; indices the entity does not have are ignored
 * @returns A new state without those columns, its box already re-derived, or null when the indices name no column the entity has
 */
export const removeErEntityColumns = (
	state: ErEntityState,
	columnIndices: readonly number[],
): ErEntityState | null => {
	const columnSources = listErEntityColumnSourcesForRemoval(
		state,
		columnIndices,
	);
	return columnSources === null
		? null
		: rewriteErEntityColumns(state, columnSources);
};
