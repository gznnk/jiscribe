import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { parseTableTrailingEdgeAxis } from "./parseTableTrailingEdgeAxis";
import type { TableState } from "../../state/TableState";
import { calcTableColumnResize } from "../shared/calcTableColumnResize";
import { calcTableLocalDragDelta } from "../shared/calcTableLocalDragDelta";
import { calcTableRowResize } from "../shared/calcTableRowResize";

/**
 * Handles a drag on one of the table's trailing edges — the two away from the
 * corner it is drawn from: the last column or the last row resizes alone, and the
 * table grows or shrinks with it from that corner. The same rules as a boundary's
 * `"leading"` mode (calcTableColumnResize / calcTableRowResize); Shift is ignored,
 * an edge having no neighbour to trade with. Which edge comes from the strip's
 * `data-action`.
 *
 * Every frame is rebuilt from the gesture-start snapshot, never from the previous
 * frame. Neither edge writes the box; the resizer re-derives it from the tracks,
 * as it does for the boundaries (handleTableRowBoundary).
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
		return columns === null ? null : { object: { ...startTable, columns } };
	}
	const rows = calcTableRowResize(
		startTable,
		startTable.rows.length - 1,
		localDelta.y,
	);
	return rows === null ? null : { object: { ...startTable, rows } };
};
