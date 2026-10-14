import { calcTableRowResize, clampTableRowHeight } from "./calcTableRowResize";
import type { TableBoundaryDragMode } from "./tableBoundaryAction";
import { calcTableRowTextFloor } from "../layout/calcTableLayout";
import type { TableLayoutSource } from "../layout/calcTableLayout";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import type { TableRowDoc } from "../schema/TableDoc";

/**
 * The stored row heights a boundary drag lands on, in one of two modes. Both move
 * the boundary by the drag distance measured from where it is drawn, and in both
 * **dragging up stops at the text of the row above** — a row's stored height is a
 * lower bound its text raises, so the boundary cannot pass the text it would have
 * to cut (calcTableRowResize).
 *
 * - **`"leading"`**: the row above takes the whole drag and the row below keeps its
 *   bound (calcTableRowResize), so the table's height changes by what the row
 *   above gained or lost.
 * - **`"pair"`**: up to where the text allows, the two rows trade and the table's
 *   height does not change. Dragging up past the text above leaves the pair as it
 *   was, the row below growing no further. Dragging down past the text of the row
 *   below grows the table instead of clipping that text: the boundary goes on
 *   following the cursor and the row below stays at its text. This asymmetry is why
 *   the row below is given what is left of the pair's height rather than the drag's
 *   own distance — taking the distance would grow it without limit once the row
 *   above had stopped shrinking.
 *
 * The bound written for the row above is what the drag asked for, not the floor it
 * was held to (calcTableRowResize).
 *
 * @param startTable - The table as of gesture start; its rows, columns, cells and rule width are read, because the floors the rule leaves the text are what a row can be squeezed to
 * @param boundaryIndex - Which inner boundary is dragged: `i` sits between `rows[i]` and `rows[i + 1]`, so 0 .. rows.length - 2. The table's own top and bottom edges are not boundaries here — the trailing one is handleTableTrailingEdge's
 * @param localDeltaY - How far the boundary moved along the table's local y axis, in px; positive heightens the row above it. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @param mode - Whether the row above alone resizes or the pair trades (readTableBoundaryDragMode)
 * @returns Fresh rows with the touched bounds rewritten, none below `TABLE_MIN_ROW_HEIGHT`, or null when the index names no inner boundary
 */
export const calcTableRowBoundaryDrag = (
	startTable: TableLayoutSource,
	boundaryIndex: number,
	localDeltaY: number,
	mode: TableBoundaryDragMode,
): TableRowDoc[] | null => {
	const trailing = startTable.rows?.[boundaryIndex + 1];
	if (trailing === undefined) {
		return null;
	}

	const resized = calcTableRowResize(startTable, boundaryIndex, localDeltaY);
	if (mode === "leading" || resized === null) {
		return resized;
	}

	const { rowEdgeYs } = readCachedTableLayout(startTable);
	// Where the boundary actually lands: never above the text of the row it would
	// have to cut into. Below is unbounded, the table growing downward instead.
	const landedY = Math.max(
		rowEdgeYs[boundaryIndex + 1] + localDeltaY,
		rowEdgeYs[boundaryIndex] + calcTableRowTextFloor(startTable, boundaryIndex),
	);
	resized[boundaryIndex + 1] = {
		...trailing,
		height: clampTableRowHeight(rowEdgeYs[boundaryIndex + 2] - landedY),
	};
	return resized;
};
