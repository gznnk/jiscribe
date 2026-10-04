import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import { TABLE_MIN_COLUMN_WIDTH } from "../schema/TableDoc";
import type { TableColumnDoc } from "../schema/TableDoc";

/**
 * The column widths a boundary drag lands on: the two columns the boundary sits
 * between trade width, so their total — and with it the table's own width — is
 * exactly what it was before the drag. Neither of the table's outer edges moves,
 * which is what makes this the same gesture a spreadsheet or a slide editor
 * offers.
 *
 * The clamp is what holds the total. A column stops at
 * {@link TABLE_MIN_COLUMN_WIDTH} rather than passing it, and because the
 * neighbour is derived by subtraction it stops in the same instant: the boundary
 * parts company with the cursor there instead of the table growing. The
 * neighbour's width is taken from the pair's total rather than from the drag
 * distance for the same reason — a width per side computed from the delta would
 * let rounding move the table's edge by a fraction of a pixel per frame.
 *
 * @param startColumns - The columns as of gesture start, left to right; read only, and the returned array is a fresh one
 * @param boundaryIndex - Which inner boundary is dragged: `i` sits between `startColumns[i]` and `startColumns[i + 1]`, so 0 .. length - 2. The table's own left and right edges are not boundaries here — those are the transform frame's to resize
 * @param localDeltaX - How far the boundary moved along the table's local x axis, in px; positive widens the column on its left. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @returns Fresh columns with the pair rewritten, both at least `TABLE_MIN_COLUMN_WIDTH`, or null when the index names no inner boundary or the pair is already too narrow to hold two minimums
 */
export const resolveTableColumnBoundaryDrag = (
	startColumns: readonly TableColumnDoc[],
	boundaryIndex: number,
	localDeltaX: number,
): TableColumnDoc[] | null => {
	const leading = startColumns[boundaryIndex];
	const trailing = startColumns[boundaryIndex + 1];
	if (leading === undefined || trailing === undefined) {
		return null;
	}
	const total = leading.width + trailing.width;
	// No split of this pair satisfies both minimums, so any write here would have
	// to widen the table. A document the validator accepted cannot get here.
	if (total < TABLE_MIN_COLUMN_WIDTH * 2) {
		return null;
	}

	const leadingWidth = roundToDecimal(
		Math.min(
			Math.max(leading.width + localDeltaX, TABLE_MIN_COLUMN_WIDTH),
			total - TABLE_MIN_COLUMN_WIDTH,
		),
		PRECISION.SIZE,
	);
	const resized = [...startColumns];
	resized[boundaryIndex] = { ...leading, width: leadingWidth };
	resized[boundaryIndex + 1] = {
		...trailing,
		width: roundToDecimal(total - leadingWidth, PRECISION.SIZE),
	};
	return resized;
};
