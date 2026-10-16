import { insertTableGridTrack } from "./insertTableGridTrack";
import type { TableAxis } from "./tableTrack";
import { fitTableBoxToGrid } from "../state/fitTableBoxToGrid";
import type { TableState } from "../state/TableState";

/**
 * Inserts one track into a table on the canvas ({@link insertTableGridTrack}) and
 * grows its box from the corner the table is drawn from.
 *
 * @param state - The table to insert into; left untouched, a new state is returned
 * @param axis - Which direction the new track runs in
 * @param at - Where it lands, 0-based; 0 puts it before every existing track and `countTableTracks(state, axis)` after the last. Values outside that range are clamped into it
 * @param sourceIndex - The existing track the new one copies everything but its text from (0-based, indexed before the insertion); omitted, the track standing at `at`, or the last one past the end
 * @returns A new state one track larger, its box grown from the corner the table is drawn from
 */
export const insertTableTrack = (
	state: TableState,
	axis: TableAxis,
	at: number,
	sourceIndex?: number,
): TableState =>
	fitTableBoxToGrid(insertTableGridTrack(state, axis, at, sourceIndex));
