import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import {
	countTableTracks,
	parseTableTrackPartId,
	tableTrackPartId,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";
import type { TableState } from "../state/TableState";

/**
 * Builds the handler behind one axis's grips. A click selects that whole track as
 * a part of its own kind — not as the run of cells it covers — which is the
 * distinction Delete reads: a track is removed where a cell range only loses its
 * text.
 *
 * The grip writes the selection and nothing else. It never returns an `object`,
 * so no click on it is a document change, and the whole strip is re-clickable
 * while a track is selected.
 *
 * Which track comes from the grip's `data-part`, one control being registered for
 * all of them; a part naming an index the grid no longer has is dropped rather
 * than selected, the strip and the state being one render apart.
 *
 * @param axis - Which tracks these grips stand for; also the part kind the click writes
 * @returns A handler for the definition's `handle`, to be paired with `events: ["click"]`
 */
export const createTableTrackGripHandler =
	(axis: TableAxis) =>
	(
		context: SelectionControlContext<TableState>,
		event: SelectionControlEvent,
	): SelectionControlResult<TableState> | null => {
		if (event.type !== "click") {
			return null;
		}
		const index = parseTableTrackPartId(event.subPart);
		if (index === null || index >= countTableTracks(context.object, axis)) {
			return null;
		}
		const partId = tableTrackPartId(index);
		return {
			selection: {
				kind: axis,
				ranges: [{ anchorId: partId, focusId: partId }],
			},
		};
	};
