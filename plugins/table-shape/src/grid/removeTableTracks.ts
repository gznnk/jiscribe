import { removeTableGridTracks } from "./removeTableGridTracks";
import type { TableAxis } from "./tableTrack";
import { fitTableBoxToGrid } from "../state/fitTableBoxToGrid";
import type { TableState } from "../state/TableState";

/**
 * Removes whole tracks from a table on the canvas ({@link removeTableGridTracks})
 * and re-derives its box, the mirror of
 * {@link import("./insertTableTrack").insertTableTrack}.
 *
 * Refusing is what `ObjectPartKindDefinition.delete` spells as null, which leaves
 * the selection standing and the keystroke spent.
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
	const removed = removeTableGridTracks(state, axis, indices);
	return removed === null ? null : fitTableBoxToGrid(removed);
};
