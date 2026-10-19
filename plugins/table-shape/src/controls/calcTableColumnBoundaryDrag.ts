import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import { calcTableColumnResize } from "./calcTableColumnResize";
import type { TableBoundaryDragMode } from "./tableBoundaryAction";
import { TABLE_MIN_COLUMN_WIDTH } from "../schema/TableDoc";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * The column widths a boundary drag lands on, in one of two modes.
 *
 * - **`"leading"`**: the column on the boundary's left takes the whole drag and
 *   every other column keeps its width (calcTableColumnResize), so the table's
 *   width changes by what that column gained or lost.
 * - **`"pair"`**: the two columns either side trade width, so their total — and
 *   with it the table's width — is exactly what it was. The clamp is what holds
 *   the total: a column stops at the minimum rather than passing it, and the
 *   neighbour, derived by subtraction, stops in the same instant. Taking the
 *   neighbour from the pair's total rather than from the drag distance keeps
 *   rounding from moving the table's edge by a fraction of a pixel per frame.
 *
 * @param startColumns - The columns as of gesture start, left to right; read only, and the returned array is a fresh one
 * @param boundaryIndex - Which inner boundary is dragged: `i` sits between `startColumns[i]` and `startColumns[i + 1]`, so 0 .. length - 2. The table's own left and right edges are not boundaries here — the trailing one is handleTableTrailingEdge's
 * @param localDeltaX - How far the boundary moved along the table's local x axis, in px; positive widens the column on its left. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @param mode - Whether the left column alone resizes or the pair trades (readTableBoundaryDragMode)
 * @returns Fresh columns with the touched ones rewritten, none below `TABLE_MIN_COLUMN_WIDTH`, or null when the index names no inner boundary or, in `"pair"`, the pair is already too narrow to hold two minimums
 */
export const calcTableColumnBoundaryDrag = (
	startColumns: readonly TableColumnDoc[],
	boundaryIndex: number,
	localDeltaX: number,
	mode: TableBoundaryDragMode,
): TableColumnDoc[] | null => {
	const leading = startColumns[boundaryIndex];
	const trailing = startColumns[boundaryIndex + 1];
	if (leading === undefined || trailing === undefined) {
		return null;
	}

	const widened = calcTableColumnResize(
		startColumns,
		boundaryIndex,
		localDeltaX,
	);
	if (mode === "leading" || widened === null) {
		return widened;
	}

	const total = leading.width + trailing.width;
	// No split of this pair satisfies both minimums, so any write here would have
	// to widen the table. A document the validator accepted cannot get here.
	if (total < TABLE_MIN_COLUMN_WIDTH * 2) {
		return null;
	}

	// The single-column resize, capped where the neighbour would pass its own
	// minimum. Rounding is monotone, so capping the rounded width is the same as
	// rounding the capped one.
	const leadingWidth = Math.min(
		widened[boundaryIndex].width,
		roundToDecimal(total - TABLE_MIN_COLUMN_WIDTH, PRECISION.SIZE),
	);
	widened[boundaryIndex] = { ...leading, width: leadingWidth };
	widened[boundaryIndex + 1] = {
		...trailing,
		width: roundToDecimal(total - leadingWidth, PRECISION.SIZE),
	};
	return widened;
};
