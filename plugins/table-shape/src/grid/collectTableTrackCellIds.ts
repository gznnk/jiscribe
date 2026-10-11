import { countTableTracks, parseTableTrackPartId } from "./tableTrack";
import type { TableAxis } from "./tableTrack";
import { tableCellSlotId } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * The cell ids the named tracks run through, track by track and each one's in
 * order along it — the slots a style written over a row or a column pick lands on.
 *
 * @param object - The table the tracks belong to; its crossing axis decides how many cells each track holds
 * @param axis - Which direction the named tracks run in
 * @param trackIds - Track part ids (tableTrackPartId); one that is not an index is skipped, one past the grid is spelled out all the same and left for the caller to drop
 * @returns The cell slot ids, repeated when a track is named twice
 */
export const collectTableTrackCellIds = (
	object: TableState,
	axis: TableAxis,
	trackIds: readonly string[],
): string[] => {
	const crossCount = countTableTracks(
		object,
		axis === "row" ? "column" : "row",
	);
	const cellIds: string[] = [];
	for (const trackId of trackIds) {
		const index = parseTableTrackPartId(trackId);
		if (index === null) {
			continue;
		}
		for (let cross = 0; cross < crossCount; cross++) {
			cellIds.push(
				axis === "row"
					? tableCellSlotId(index, cross)
					: tableCellSlotId(cross, index),
			);
		}
	}
	return cellIds;
};
