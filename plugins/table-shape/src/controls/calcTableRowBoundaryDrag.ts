import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import type { TableBoundaryDragMode } from "./tableBoundaryAction";
import { calcTableRowTextFloor } from "../layout/calcTableLayout";
import type { TableLayoutSource } from "../layout/calcTableLayout";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import { TABLE_MIN_ROW_HEIGHT } from "../schema/TableDoc";
import type { TableRowDoc } from "../schema/TableDoc";

/** A bound as the document may hold it: never negative, at the precision sizes are stored to. */
const clampRowHeight = (height: number): number =>
	roundToDecimal(Math.max(height, TABLE_MIN_ROW_HEIGHT), PRECISION.SIZE);

/**
 * The stored row heights a boundary drag lands on, in one of two modes. Both move
 * the boundary by the drag distance measured from the height the row above is
 * *drawn* at (the layout's, not the stored one), so grabbing a boundary and moving
 * it 10px moves it 10px whatever the rows stored beforehand.
 *
 * **A row's stored height is a lower bound, not its height** ({@link TableRowDoc}):
 * the layout draws it at the greater of that bound and what its tallest cell's text
 * needs (calcTableLayout). So in either mode **dragging up stops at the text of the
 * row above** — the boundary cannot pass the text it would have to cut.
 *
 * - **`"leading"`**: the row above takes the whole drag and the row below keeps its
 *   bound, so the table's height changes by what the row above gained or lost.
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
 * was held to. Storing the floor would make the row keep that height after its text
 * was deleted, and the bound is left saying what was asked.
 *
 * @param startTable - The table as of gesture start; its rows, columns, cells and rule width are read, because the floors the rule leaves the text are what a row can be squeezed to
 * @param boundaryIndex - Which inner boundary is dragged: `i` sits between `rows[i]` and `rows[i + 1]`, so 0 .. rows.length - 2. The table's own top and bottom edges are not boundaries here
 * @param localDeltaY - How far the boundary moved along the table's local y axis, in px; positive heightens the row above it. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @param mode - Whether the row above alone resizes or the pair trades (readTableBoundaryDragMode)
 * @returns Fresh rows with the touched bounds rewritten, none below {@link TABLE_MIN_ROW_HEIGHT}, or null when the index names no inner boundary
 */
export const calcTableRowBoundaryDrag = (
	startTable: TableLayoutSource,
	boundaryIndex: number,
	localDeltaY: number,
	mode: TableBoundaryDragMode,
): TableRowDoc[] | null => {
	const startRows = startTable.rows ?? [];
	const leading = startRows[boundaryIndex];
	const trailing = startRows[boundaryIndex + 1];
	if (leading === undefined || trailing === undefined) {
		return null;
	}

	const { rowEdgeYs } = readCachedTableLayout(startTable);
	const leadingHeight = rowEdgeYs[boundaryIndex + 1] - rowEdgeYs[boundaryIndex];

	const asked = leadingHeight + localDeltaY;
	const resized = [...startRows];
	resized[boundaryIndex] = { ...leading, height: clampRowHeight(asked) };
	if (mode === "leading") {
		return resized;
	}

	const trailingHeight =
		rowEdgeYs[boundaryIndex + 2] - rowEdgeYs[boundaryIndex + 1];
	// Where the boundary actually lands: never above the text of the row it would
	// have to cut into. Below is unbounded, the table growing downward instead.
	const landed = Math.max(
		asked,
		calcTableRowTextFloor(startTable, boundaryIndex),
	);
	resized[boundaryIndex + 1] = {
		...trailing,
		height: clampRowHeight(leadingHeight + trailingHeight - landed),
	};
	return resized;
};
