import type {
	ObjectPartSelection,
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";

import { collectTableCellRange } from "../grid/collectTableCellRange";
import { countTableTracks } from "../grid/tableTrack";
import { tableCellTextSlotId } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/** Whether the pick is a cell pick whose ranges together reach every cell of the table. */
const coversEveryCell = (
	table: TableState,
	selectedPart: ObjectPartSelection | null,
): boolean => {
	if (selectedPart?.kind !== TEXT_SLOT_PART_KIND) {
		return false;
	}
	const pickedCellIds = new Set(
		selectedPart.ranges.flatMap((range) =>
			collectTableCellRange(table, range.anchorId, range.focusId),
		),
	);
	const rowCount = countTableTracks(table, "row");
	const columnCount = countTableTracks(table, "column");
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			if (!pickedCellIds.has(tableCellTextSlotId(row, column))) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Handles a click on the corner grip: picks every cell as one cell range, from
 * the first cell to the last, the rectangle they corner being the whole grid
 * (collectTableCellRange). Cells rather than every row, so Delete clears the
 * text and leaves the grid standing.
 *
 * Modifiers are ignored, a click with Shift or Ctrl / Meta being a plain one.
 * Null when the cells are already all picked, by however many ranges. Like the
 * track grips it writes the selection alone and never an `object`.
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls, with
 * `events: ["click"]`.
 */
export const handleTableCornerGrip = (
	context: SelectionControlContext<TableState>,
	event: SelectionControlEvent,
): SelectionControlResult<TableState> | null => {
	if (event.type !== "click") {
		return null;
	}
	const { object, selectedPart } = context;
	if (coversEveryCell(object, selectedPart)) {
		return null;
	}
	return {
		selection: {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{
					anchorId: tableCellTextSlotId(0, 0),
					focusId: tableCellTextSlotId(
						countTableTracks(object, "row") - 1,
						countTableTracks(object, "column") - 1,
					),
				},
			],
		},
	};
};
