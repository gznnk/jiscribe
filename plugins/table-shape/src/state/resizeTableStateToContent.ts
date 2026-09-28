import { PRECISION } from "@jiscribe/canvas-sdk";
import {
	calcFrameCenterFromTopLeft,
	calcFrameTopLeft,
	roundToDecimal,
} from "@jiscribe/geometry";
import type { Dimensions } from "@jiscribe/geometry";

import type { TableState } from "./TableState";
import { calcTableFrameSize } from "../layout/calcTableFrameSize";
import { distributeTableWidthToColumns } from "../layout/distributeTableWidthToColumns";

/**
 * The state with `size` as its box. The box grows right and down: the corner the
 * document names stays where it is drawn (calcFrameTopLeft), and the center moves
 * instead.
 */
const growFromDrawnCorner = (
	state: TableState,
	size: Dimensions,
): TableState => {
	const drawnTopLeft = calcFrameTopLeft(state);
	const anchor = {
		x: roundToDecimal(drawnTopLeft.x, PRECISION.COORDINATE),
		y: roundToDecimal(drawnTopLeft.y, PRECISION.COORDINATE),
	};
	const center = calcFrameCenterFromTopLeft(anchor, size, state);
	return {
		...state,
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
	};
};

/**
 * Reconciles a table's box with its own grid, in whichever direction they
 * disagree. Registered as the type's `contentResizer`, so it runs on load, on
 * undo, on external sync and on every frame of every gesture.
 *
 * Usually the grid is what moved and the box follows it: a cell gaining a line
 * widens no column but makes its row, and so the table, taller. The box is then
 * the column widths summed by the resolved row heights summed (calcTableLayout).
 *
 * The other direction is the outer-frame resize. `TransformControlHandler` writes
 * a width onto the state and knows nothing of grids, and this is the only place
 * that width is seen before the derivation would throw it away — so a width
 * disagreeing with the columns is read as an outside write and the columns are
 * rewritten to sum to it, keeping the proportions they hold
 * ({@link distributeTableWidthToColumns}). The box is then derived from the
 * rewritten columns as ever, which is what re-wraps the cells and lets the height
 * follow.
 *
 * **Only the width is read that way.** Text never changes a column's width, so a
 * width the columns do not sum to can only have been written from outside. A row's
 * stored height is a lower bound its text raises, so deleting text and dragging the
 * bottom edge down look identical here — reading the height the same way would stop
 * a table ever shrinking again. Hence `resize: "width"` on the type (see
 * TABLE_TRANSFORM_HANDLES); a height the grid disagrees with is always the grid's
 * answer.
 *
 * A width the grid cannot reach — below `columns.length * TABLE_MIN_COLUMN_WIDTH` —
 * leaves the derived box to win, so the table visibly stops instead of silently
 * narrowing.
 *
 * Returning `state` itself when neither side moved is part of the contract
 * (ObjectContentResizer): callers run this on every frame of every gesture and skip
 * the rest of the pass on reference equality. The decision is made on the numbers,
 * never on the arrays — `reconcileObjectContentSizes` compares `columns` and `rows`
 * by reference, so a fresh array handed back on a still frame would re-measure the
 * table for nothing.
 *
 * @param state - The table to measure; its `columns` / `rows` / `text` are read, and its box — and, on an outside write of the width, its `columns` — rewritten
 * @returns The state with the two reconciled, or the same object when nothing moved
 */
export const resizeTableStateToContent = (state: TableState): TableState => {
	const gridSize = calcTableFrameSize(state);
	// A point geometry's frame starts at zero size and is grown from there
	// (createFrameMapper), so a zero width is a box not yet derived rather than a
	// width written over the grid.
	if (state.width > 0 && gridSize.width !== state.width) {
		const columns = distributeTableWidthToColumns(state.columns, state.width);
		if (columns !== null) {
			const widened = { ...state, columns };
			return growFromDrawnCorner(widened, calcTableFrameSize(widened));
		}
		return growFromDrawnCorner(state, gridSize);
	}
	if (gridSize.width === state.width && gridSize.height === state.height) {
		return state;
	}
	return growFromDrawnCorner(state, gridSize);
};
