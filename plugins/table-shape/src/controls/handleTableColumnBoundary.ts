import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";

import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import { resolveTableColumnBoundaryDrag } from "./resolveTableColumnBoundaryDrag";
import { parseTableBoundaryIndex } from "./tableBoundaryPart";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on the boundary between two columns: the pair trades width and
 * the table's own edges stay put (resolveTableColumnBoundaryDrag). Which boundary
 * comes from the strip's `data-part`, one control being registered for all of
 * them.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame, so a cursor brought back to where it started restores the widths it
 * started with. `width` / `cx` are deliberately not written: the table's box is
 * derived from the grid on the same reducer tick (resizeTableStateToContent), and
 * two columns summing to what they summed to leave it exactly where it was.
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls.
 */
export const handleTableColumnBoundary = (
	context: SelectionControlContext<TableState>,
	event: SelectionControlEvent,
): TableState | null => {
	const boundaryIndex = parseTableBoundaryIndex(event.subPart);
	if (boundaryIndex === null) {
		return null;
	}
	const startTable = context.startObject;
	const columns = resolveTableColumnBoundaryDrag(
		startTable.columns,
		boundaryIndex,
		calcTableLocalDragDelta(startTable, event).x,
	);
	return columns === null ? null : { ...startTable, columns };
};
