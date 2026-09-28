import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";

import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import { resolveTableRowBoundaryDrag } from "./resolveTableRowBoundaryDrag";
import { parseTableBoundaryIndex } from "./tableBoundaryPart";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on the boundary between two rows: the pair trades height as far
 * as their text allows, and the table grows only where a row has reached its text
 * floor (resolveTableRowBoundaryDrag states the rule). Which boundary comes from
 * the strip's `data-part`, one control being registered for all of them.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame, so a cursor brought back to where it started restores the bounds it
 * started with. `height` / `cy` are deliberately not written: the table's box is
 * derived from the grid on the same reducer tick (resizeTableStateToContent),
 * which is also what lets the box grow when a row can give no more.
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls.
 */
export const handleTableRowBoundary = (
	context: SelectionControlContext<TableState>,
	event: SelectionControlEvent,
): TableState | null => {
	const boundaryIndex = parseTableBoundaryIndex(event.subPart);
	if (boundaryIndex === null) {
		return null;
	}
	const startTable = context.startObject;
	const rows = resolveTableRowBoundaryDrag(
		startTable,
		boundaryIndex,
		calcTableLocalDragDelta(startTable, event).y,
	);
	return rows === null ? null : { ...startTable, rows };
};
