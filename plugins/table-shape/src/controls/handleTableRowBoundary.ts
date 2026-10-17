import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import { calcTableRowBoundaryDrag } from "./calcTableRowBoundaryDrag";
import {
	parseTableBoundaryIndex,
	readTableBoundaryDragMode,
} from "./tableBoundaryAction";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on the boundary between two rows: the row above resizes alone
 * and the table grows or shrinks with it, or with Shift held the pair trades
 * height as far as their text allows (calcTableRowBoundaryDrag states both rules).
 * The mode is read off every frame's modifiers. Which boundary comes from the
 * strip's `data-action`, one control being registered for all of them.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame, so a cursor brought back to where it started — or a Shift pressed or
 * released — restores what that mode gives from the start. `height` / `cy` are
 * not written in either mode: the resizer re-derives the box from the rows, from
 * the corner the table is drawn from, on the same reducer tick
 * (reconcileTableBoxWithGrid).
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls.
 */
export const handleTableRowBoundary = (
	context: SelectionControlContext<TableState>,
	event: SelectionControlEvent,
): SelectionControlResult<TableState> | null => {
	// Drags only: the control declares no `events`, so nothing else reaches
	// here and the union is merely wider than the traffic.
	if (event.type !== "drag" && event.type !== "dragEnd") {
		return null;
	}
	const boundaryIndex = parseTableBoundaryIndex(event.subAction);
	if (boundaryIndex === null) {
		return null;
	}
	const startTable = context.startObject;
	const rows = calcTableRowBoundaryDrag(
		startTable,
		boundaryIndex,
		calcTableLocalDragDelta(startTable, event).y,
		readTableBoundaryDragMode(event.mods),
	);
	return rows === null ? null : { object: { ...startTable, rows } };
};
