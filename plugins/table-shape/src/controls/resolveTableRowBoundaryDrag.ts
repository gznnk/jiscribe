import { PRECISION } from "@jiscribe/canvas-sdk";
import { roundToDecimal } from "@jiscribe/geometry";

import {
	calcTableLayout,
	calcTableRowTextFloor,
} from "../layout/calcTableLayout";
import type { TableLayoutState } from "../layout/calcTableLayout";
import { TABLE_MIN_ROW_HEIGHT } from "../schema/TableDoc";
import type { TableRowDoc } from "../schema/TableDoc";

/** A bound as the document may hold it: never negative, at the precision sizes are stored to. */
const clampRowHeight = (height: number): number =>
	roundToDecimal(Math.max(height, TABLE_MIN_ROW_HEIGHT), PRECISION.SIZE);

/**
 * The stored row heights a boundary drag lands on: the boundary is moved by the
 * drag distance, and the two rows it sits between are given the heights that puts
 * them at. Each is measured from the height the row is *drawn* at (the layout's,
 * not the stored one), so grabbing a boundary and moving it 10px moves it 10px
 * whatever the rows stored beforehand.
 *
 * **A row's stored height is a lower bound, not its height** ({@link TableRowDoc}):
 * the layout draws it at the greater of that bound and what its tallest cell's text
 * needs (calcTableLayout). So the two directions are not mirror images, and the rule
 * is not symmetric:
 *
 * - **Up to where the text allows, the two rows trade.** One's gain is the other's
 *   loss and the table's height does not change.
 * - **Dragging up stops at the text of the row above.** The boundary cannot pass
 *   the text it would have to cut, and nothing is gained by moving the table's top
 *   edge instead — that corner is the table's anchor. The row below therefore stops
 *   growing too, and the pair keeps the height it had.
 * - **Dragging down past the text of the row below grows the table.** Here the
 *   edge that would move is the bottom one, which the table grows away from
 *   anyway, so the boundary goes on following the cursor, the row below stays at
 *   its text, and the table gets taller. The text is never clipped to keep the box
 *   still.
 *
 * The asymmetry is why the row below is given what is left of the pair's height
 * rather than the drag's own distance: taking the distance would grow it without
 * limit once the row above had stopped shrinking.
 *
 * The bound written for the row above is what the drag asked for, not the floor it
 * was held to. Storing the floor would make the row keep that height after its text
 * was deleted, and the bound is left saying what was asked.
 *
 * @param startTable - The table as of gesture start; its rows, columns, cells and rule width are read, because the floors the rule leaves the text are what a row can be squeezed to
 * @param boundaryIndex - Which inner boundary is dragged: `i` sits between `rows[i]` and `rows[i + 1]`, so 0 .. rows.length - 2. The table's own top and bottom edges are not boundaries here
 * @param localDeltaY - How far the boundary moved along the table's local y axis, in px; positive heightens the row above it. Measured in local axes (calcTableLocalDragDelta), so rotation and flips are already accounted for
 * @returns Fresh rows with the pair's bounds rewritten, neither below {@link TABLE_MIN_ROW_HEIGHT}, or null when the index names no inner boundary
 */
export const resolveTableRowBoundaryDrag = (
	startTable: TableLayoutState,
	boundaryIndex: number,
	localDeltaY: number,
): TableRowDoc[] | null => {
	const startRows = startTable.rows ?? [];
	const leading = startRows[boundaryIndex];
	const trailing = startRows[boundaryIndex + 1];
	if (leading === undefined || trailing === undefined) {
		return null;
	}

	const { rowYs } = calcTableLayout(startTable);
	const leadingHeight = rowYs[boundaryIndex + 1] - rowYs[boundaryIndex];
	const trailingHeight = rowYs[boundaryIndex + 2] - rowYs[boundaryIndex + 1];

	const asked = leadingHeight + localDeltaY;
	// Where the boundary actually lands: never above the text of the row it would
	// have to cut into. Below is unbounded, the table growing downward instead.
	const landed = Math.max(
		asked,
		calcTableRowTextFloor(startTable, boundaryIndex),
	);

	const resized = [...startRows];
	resized[boundaryIndex] = { ...leading, height: clampRowHeight(asked) };
	resized[boundaryIndex + 1] = {
		...trailing,
		height: clampRowHeight(leadingHeight + trailingHeight - landed),
	};
	return resized;
};
