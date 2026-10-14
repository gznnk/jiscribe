import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcTableColumnResize } from "./calcTableColumnResize";
import { calcTableLocalDragDelta } from "./calcTableLocalDragDelta";
import { calcTableRowResize } from "./calcTableRowResize";
import { parseTableTrailingEdgeAxis } from "./tableBoundaryAction";
import { resizeTableToColumns } from "../state/resizeTableToColumns";
import type { TableState } from "../state/TableState";

/**
 * Handles a drag on one of the table's trailing edges — the two away from the
 * corner it is drawn from: the last column or the last row resizes alone, and the
 * table grows or shrinks with it from that corner. The same rules as a boundary's
 * `"leading"` mode (calcTableColumnResize / calcTableRowResize); Shift is ignored,
 * an edge having no neighbour to trade with. Which edge comes from the strip's
 * `data-action`.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame. The column edge writes the box itself (resizeTableToColumns); the row
 * edge leaves `height` / `cy` to the resizer, as the row boundary does
 * (handleTableRowBoundary).
 *
 * Registered via the table's ObjectTypeDefinition.selectionControls.
 */
export const handleTableTrailingEdge = (
	context: SelectionControlContext<TableState>,
	event: SelectionControlEvent,
): SelectionControlResult<TableState> | null => {
	// Drags only: the control declares no `events`, so nothing else reaches
	// here and the union is merely wider than the traffic.
	if (event.type !== "drag" && event.type !== "dragEnd") {
		return null;
	}
	const axis = parseTableTrailingEdgeAxis(event.subAction);
	if (axis === null) {
		return null;
	}
	const startTable = context.startObject;
	const localDelta = calcTableLocalDragDelta(startTable, event);
	if (axis === "column") {
		const columns = calcTableColumnResize(
			startTable.columns,
			startTable.columns.length - 1,
			localDelta.x,
		);
		return columns === null
			? null
			: { object: resizeTableToColumns(startTable, columns) };
	}
	const rows = calcTableRowResize(
		startTable,
		startTable.rows.length - 1,
		localDelta.y,
	);
	return rows === null ? null : { object: { ...startTable, rows } };
};
