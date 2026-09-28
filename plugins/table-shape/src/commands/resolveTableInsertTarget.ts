import type { CanvasControllerState } from "@jiscribe/canvas-sdk";

import { resolveTableTrackSelection } from "./resolveTableTrackSelection";
import type { TableAxis } from "../grid/tableTrack";
import type { TableState } from "../state/TableState";

/** Which edge of the referenced tracks the new one lands on. */
export type TableInsertSide = "before" | "after";

/** Everything an insert command needs off the canvas, once it knows it can run. */
export type TableInsertTarget = {
	/** The table to rewrite, as `state.objects` keys it. */
	objectId: string;
	/** That table, narrowed. */
	table: TableState;
	/** Where the new track goes, 0-based along the axis. */
	at: number;
};

/**
 * What an insert command acts on, or null when it must report itself unavailable.
 *
 * A selection spanning several tracks inserts outside the whole span — above the
 * topmost or below the bottommost — which is how a range reads once it is one
 * thing. Which tracks a selection names at all is
 * {@link resolveTableTrackSelection}'s answer.
 *
 * @param state - The canvas to read; the sole selected object, the part selection standing on it and whether a text edit is open are all consulted
 * @param axis - The direction the new track would run in
 * @param side - Which end of the referenced span it lands on: `"before"` at the lowest referenced index, `"after"` one past the highest
 * @returns The table and the insertion point, or null when the selection is not one table's, names no track along `axis`, or a cell is being edited
 */
export const resolveTableInsertTarget = (
	state: CanvasControllerState,
	axis: TableAxis,
	side: TableInsertSide,
): TableInsertTarget | null => {
	const selected = resolveTableTrackSelection(state, axis);
	if (selected === null) {
		return null;
	}
	const { objectId, table, indices } = selected;
	return {
		objectId,
		table,
		at: side === "before" ? Math.min(...indices) : Math.max(...indices) + 1,
	};
};
