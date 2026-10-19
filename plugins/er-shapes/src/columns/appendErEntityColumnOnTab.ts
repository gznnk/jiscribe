import { insertErEntityColumn } from "./insertErEntityColumn";
import {
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The `"textSlot"` kind's `extend`: Tab off the last slot appends an empty
 * column, even after an empty last one, and lands on its name, as Add Below
 * does. No column moves, so no connector needs re-pointing.
 *
 * @param state - The entity being edited; left untouched
 * @returns The entity with the column appended, its box re-derived, and the new column's name slot to land on
 */
export const appendErEntityColumnOnTab = (
	state: ErEntityState,
): { object: ErEntityState; landingPartId: string } => {
	const columnCount = countErEntityColumns(state.text);
	return {
		object: insertErEntityColumn(state, columnCount),
		landingPartId: erEntityColumnTextSlotId(columnCount, "name"),
	};
};
