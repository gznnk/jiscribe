import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";

import { readTableTrackTarget } from "./readTableTrackTarget";
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
	/**
	 * The referenced track the new one is put next to, 0-based along the axis: the
	 * lowest referenced index for `"before"`, the highest for `"after"`. A new
	 * column copies its width.
	 */
	besideIndex: number;
};

/**
 * What an insert command acts on, or null when it must report itself unavailable.
 *
 * A selection spanning several tracks inserts outside the whole span — above the
 * topmost or below the bottommost — which is how a range reads once it is one
 * thing. Which tracks a selection names at all is
 * {@link readTableTrackTarget}'s answer.
 *
 * @param state - The canvas to read; the sole selected object, the part selection standing on it and whether a text edit is open are all consulted
 * @param axis - The direction the new track would run in
 * @param side - Which end of the referenced span it lands on: `"before"` at the lowest referenced index, `"after"` one past the highest
 * @param objectPartKind - The canvas's part-kind registry (`registries.objectPartKind`), handed straight to readTableTrackTarget
 * @returns The table, the insertion point and the track it is put next to, or null when the selection is not one table's, names no track along `axis`, or a cell is being edited
 */
export const readTableInsertTarget = (
	state: CanvasControllerState,
	axis: TableAxis,
	side: TableInsertSide,
	objectPartKind: ICanvasRegistries["objectPartKind"],
): TableInsertTarget | null => {
	const selected = readTableTrackTarget(state, axis, objectPartKind);
	if (selected === null) {
		return null;
	}
	const { objectId, table, indices } = selected;
	const besideIndex =
		side === "before" ? Math.min(...indices) : Math.max(...indices);
	return {
		objectId,
		table,
		at: side === "before" ? besideIndex : besideIndex + 1,
		besideIndex,
	};
};
