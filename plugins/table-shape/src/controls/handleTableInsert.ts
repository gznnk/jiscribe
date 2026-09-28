import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { parseTableBoundaryIndex } from "./tableBoundaryPart";
import { insertTableTrack } from "../grid/insertTableTrack";
import { countTableTracks, tableTrackPartId } from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import type { TableState } from "../state/TableState";

/**
 * Builds the handler behind one axis's `+` badges. A click inserts an empty track
 * at the boundary the badge stands on, the same rewrite the four insert commands
 * run (insertTableTrack) — the commands act on what is selected, this on what was
 * pointed at.
 *
 * The click leaves the inserted track selected, which is the one selection that
 * cannot come out stale: the grid renumbers behind an insertion, so a cell or
 * track selection left as written would come back naming its neighbour. Remapping
 * it instead (remapTablePartSelectionForInsert, which the commands use) is not
 * open to a selection control — it is handed its own object and nothing else, so
 * it cannot read the live selection to move it.
 *
 * Which boundary comes from the badge's `data-part`, one control being registered
 * for all of them. Insertion positions number one more than the tracks, the outer
 * two edges included, so the bound is the track count itself rather than one less.
 *
 * @param axis - Which direction the inserted track runs in; also the part kind the click leaves selected
 * @returns A handler for the definition's `handle`, to be paired with `events: ["click"]`
 */
export const createTableInsertHandler =
	(axis: TableAxis) =>
	(
		context: SelectionControlContext<TableState>,
		event: SelectionControlEvent,
	): SelectionControlResult<TableState> | null => {
		if (event.type !== "click") {
			return null;
		}
		const at = parseTableBoundaryIndex(event.subPart);
		// A badge naming a position the grid no longer offers is dropped rather
		// than clamped, the badges and the state being one render apart.
		if (at === null || at > countTableTracks(context.object, axis)) {
			return null;
		}
		return {
			object: insertTableTrack(context.object, axis, at),
			selection: { kind: axis, partIds: [tableTrackPartId(at)] },
		};
	};
