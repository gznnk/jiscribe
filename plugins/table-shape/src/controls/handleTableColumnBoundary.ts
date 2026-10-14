import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcTableColumnBoundaryDrag } from "./calcTableColumnBoundaryDrag";
import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import {
	parseTableBoundaryIndex,
	readTableBoundaryDragMode,
} from "./tableBoundaryAction";
import { resizeTableToColumns } from "../state/resizeTableToColumns";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on the boundary between two columns: the column on its left
 * resizes alone and the table grows or shrinks with it, or with Shift held the
 * pair trades width and the table's own edges stay put
 * (calcTableColumnBoundaryDrag). The mode is read off every frame's modifiers.
 * Which boundary comes from the strip's `data-action`, one control being
 * registered for all of them.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame, so a cursor brought back to where it started — or a Shift pressed or
 * released — restores what that mode gives from the start.
 *
 * When the columns' total changes, the box is written here: the content resizer
 * reads a `width` the columns do not sum to as an outer-frame resize and would
 * spread it back over every column (reconcileTableBoxWithGrid). So the new sum
 * goes onto `width`, with the center moved to keep the corner the table is drawn
 * from (resizeTableFromDrawnCorner). In `"pair"` the sum is unchanged and the box
 * is left to the resizer.
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
	const mode = readTableBoundaryDragMode(event.mods);
	const columns = calcTableColumnBoundaryDrag(
		startTable.columns,
		boundaryIndex,
		calcTableLocalDragDelta(startTable, event).x,
		mode,
	);
	if (columns === null) {
		return null;
	}
	if (mode === "pair") {
		return { object: { ...startTable, columns } };
	}
	return { object: resizeTableToColumns(startTable, columns) };
};
