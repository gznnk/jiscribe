import type { ObjectContentResizeContext } from "@jiscribe/canvas";

import { resizeTableHoldingEdges } from "./resizeTableHoldingEdges";
import type { TableState } from "./TableState";
import {
	calcTableColumnsWidth,
	calcTableMinHeight,
	calcTableMinWidth,
} from "../layout/calcTableLayout";
import { distributeTableHeightToRows } from "../layout/distributeTableHeightToRows";
import { distributeTableWidthToColumns } from "../layout/distributeTableWidthToColumns";
import {
	readCachedTableLayout,
	writeTableLayoutCache,
} from "../layout/readCachedTableLayout";

/**
 * Reconciles a table's box with its own grid. Registered as the type's
 * `contentResizer`, so it runs on load, on undo, on external sync and on every
 * frame of every gesture.
 *
 * **During a transform-handle resize the axes the handle writes are inputs**
 * (`context.resizedAxes`), and the tracks are rewritten to meet them, keeping the
 * proportions they hold: a written width over the columns
 * ({@link distributeTableWidthToColumns}), then a written height over the rows as
 * they are drawn at those columns ({@link distributeTableHeightToRows}).
 * `TransformControlHandler` writes the box and knows nothing of grids, and this is
 * the only place that write is seen before the derivation would throw it away.
 *
 * **At every other time the grid is the only source of the box**: the column
 * widths summed by the resolved row heights summed (calcTableLayout). A cell
 * gaining a line makes its row, and so the table, taller; deleting it lets the
 * table shrink back, a row's stored height being only a lower bound.
 *
 * Either way the box is then derived from the grid, which is what re-wraps the
 * cells and lets the other axis follow. It grows or shrinks from the edges the
 * drag holds — along an axis it does not write, and off a drag, from the corner
 * the table is drawn from. A size the grid cannot reach — below
 * {@link calcTableMinWidth} or {@link calcTableMinHeight} — leaves the derived box
 * to win, so the table visibly stops at the held edge instead of silently
 * shrinking or sliding with the cursor. Both floors are also kept on the state as
 * `minWidth` / `minHeight`, for the transform frame to stop at itself.
 *
 * Returning `state` itself when nothing moved is part of the contract
 * (ObjectContentResizer): callers run this on every frame of every gesture and skip
 * the rest of the pass on reference equality. The decision is made on the numbers,
 * never on the arrays — `reconcileObjectContentSizes` compares `columns` and `rows`
 * by reference, so a fresh array handed back on a still frame would re-measure the
 * table for nothing.
 *
 * The grid is laid out once per run against the tracks the table ends up with —
 * twice when a written height rewrites the rows, the row floors depending on the
 * columns — and that layout is left in the cache under the object handed back, so
 * the renderers' read of it costs nothing. The pass measures only the cells it has
 * not seen at their width (readCachedCellTextHeight): a row boundary drag measures
 * none, a grid rewrite only the cells it created. Web fonts arriving move the
 * measurement generation on, which both caches compare against, so the re-measure
 * core runs then (REMEASURE_TEXT) is answered afresh.
 *
 * @param state - The table to measure; its `columns` / `rows` / `text` are read, and its box, `minWidth` and `minHeight` — and, for an axis a resize drag writes, its `columns` or `rows` — rewritten
 * @param context - The resize context core hands every content resizer; only `resizedAxes` is read — the axes taken as inputs and the edges the box grows from — and absent it no axis of the box is read as an input
 * @returns The state with the two reconciled, or the same object when nothing moved
 */
export const reconcileTableBoxWithGrid = (
	state: TableState,
	context: ObjectContentResizeContext,
): TableState => {
	const resizedAxes = context.resizedAxes;
	// The sum is all the width decision needs; the cells are measured below, once,
	// against the columns the table keeps.
	const columns =
		resizedAxes?.width !== undefined &&
		calcTableColumnsWidth(state.columns) !== state.width
			? distributeTableWidthToColumns(state.columns, state.width)
			: null;
	const columnSource = columns === null ? state : { ...state, columns };
	const columnLayout = readCachedTableLayout(columnSource);
	const rows =
		resizedAxes?.height !== undefined && columnLayout.height !== state.height
			? distributeTableHeightToRows(columnSource, state.height)
			: null;
	const source = rows === null ? columnSource : { ...columnSource, rows };
	const layout = rows === null ? columnLayout : readCachedTableLayout(source);

	const minWidth = calcTableMinWidth(source.columns);
	const minHeight = calcTableMinHeight(layout);
	const reconciled =
		source === state &&
		layout.width === state.width &&
		layout.height === state.height &&
		state.minWidth === minWidth &&
		state.minHeight === minHeight
			? state
			: {
					...resizeTableHoldingEdges(source, layout, resizedAxes ?? {}),
					minWidth,
					minHeight,
				};
	writeTableLayoutCache(reconciled, layout);
	return reconciled;
};
