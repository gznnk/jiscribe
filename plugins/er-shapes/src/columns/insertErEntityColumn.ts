import {
	listErEntityColumnIndices,
	rewriteErEntityColumns,
} from "./rewriteErEntityColumns";
import type { ErEntityColumnSource } from "./rewriteErEntityColumns";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The column order an insertion leaves (rewriteErEntityColumns): the entity's
 * columns with one fresh column at `at`, every column at or past it moving one
 * along.
 *
 * @param state - The entity to insert into; read only
 * @param at - Where the new column goes, 0-based in declared order; clamped to `0`…the column count, so the count appends
 * @returns One entry per column of the result
 */
export const listErEntityColumnSourcesForInsert = (
	state: ErEntityState,
	at: number,
): ErEntityColumnSource[] => {
	const columnSources: ErEntityColumnSource[] =
		listErEntityColumnIndices(state);
	const insertAt = Math.min(Math.max(at, 0), columnSources.length);
	columnSources.splice(insertAt, 0, null);
	return columnSources;
};

/**
 * Inserts one column of three empty slots. The slot ids of every column at or
 * past `at` move one along, and so do their connect point ids; the connectors
 * attached to them are moved along with them by the canvas-side rewrite
 * (rewriteErEntityColumnsOnCanvas), which the commands go through.
 *
 * @param state - The entity to insert into; left untouched
 * @param at - Where the new column goes, 0-based in declared order; clamped to `0`…the column count, so the count appends
 * @returns A new state holding the column, its box already re-derived (reconcileErEntityBox)
 */
export const insertErEntityColumn = (
	state: ErEntityState,
	at: number,
): ErEntityState =>
	rewriteErEntityColumns(state, listErEntityColumnSourcesForInsert(state, at));
