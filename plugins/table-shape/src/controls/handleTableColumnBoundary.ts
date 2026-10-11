import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcTableColumnBoundaryDrag } from "./calcTableColumnBoundaryDrag";
import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import { parseTableBoundaryIndex } from "./tableBoundaryAction";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on the boundary between two columns: the pair trades width and
 * the table's own edges stay put (calcTableColumnBoundaryDrag). Which boundary
 * comes from the strip's `data-action`, one control being registered for all of
 * them.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame, so a cursor brought back to where it started restores the widths it
 * started with. `width` / `cx` are deliberately not written: the table's box is
 * derived from the grid on the same reducer tick (reconcileTableBoxWithGrid), and
 * two columns summing to what they summed to leave it exactly where it was.
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls.
 */
export const handleTableColumnBoundary = (
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
	const columns = calcTableColumnBoundaryDrag(
		startTable.columns,
		boundaryIndex,
		calcTableLocalDragDelta(startTable, event).x,
	);
	return columns === null ? null : { object: { ...startTable, columns } };
};
