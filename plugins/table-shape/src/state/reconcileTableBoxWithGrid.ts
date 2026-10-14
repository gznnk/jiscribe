import { resizeTableFromDrawnCorner } from "./resizeTableFromDrawnCorner";
import type { TableState } from "./TableState";
import {
	calcTableColumnsWidth,
	calcTableLayout,
} from "../layout/calcTableLayout";
import { distributeTableWidthToColumns } from "../layout/distributeTableWidthToColumns";
import { forgetTableCellTextHeights } from "../layout/readCachedCellTextHeight";
import { writeTableLayoutCache } from "../layout/readCachedTableLayout";

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
 * The grid is laid out once per run, against the columns the table ends up with,
 * and that layout is left in the cache under the object handed back — so an outer
 * resize costs one pass per frame, renderers included, not one per side of the
 * decision. The pass measures only the cells it has not seen at their width
 * (readCachedCellTextHeight): a row boundary drag measures none, a grid rewrite
 * only the cells it created.
 *
 * @param state - The table to measure; its `columns` / `rows` / `text` are read, and its box — and, on an outside write of the width, its `columns` — rewritten
 * @param remeasure - True when the measurement changed under an unchanged state (core's `remeasure`, fonts finishing to load): every cell measurement held so far is dropped and the grid measured afresh. False by default
 * @returns The state with the two reconciled, or the same object when nothing moved
 */
export const reconcileTableBoxWithGrid = (
	state: TableState,
	remeasure = false,
): TableState => {
	if (remeasure) {
		forgetTableCellTextHeights();
	}
	// Every table state is handed over with the box its own grid answers for
	// (TableMapper measures it rather than leaving it to this pass), so a width the
	// columns do not sum to can only have been written from outside. The sum is all
	// that decision needs; the cells are measured below, once, against the columns
	// the table keeps.
	const columns =
		calcTableColumnsWidth(state.columns) === state.width
			? null
			: distributeTableWidthToColumns(state.columns, state.width);
	const source = columns === null ? state : { ...state, columns };
	// Laid out, not read from the layout cache: an entry written before a remeasure
	// would be handed back as it was (undo restoring an older grid). The cells come
	// from their own cache, which a remeasure does reach.
	const layout = calcTableLayout(source);
	const reconciled =
		source === state &&
		layout.width === state.width &&
		layout.height === state.height
			? state
			: resizeTableFromDrawnCorner(source, layout);
	writeTableLayoutCache(reconciled, layout);
	return reconciled;
};
