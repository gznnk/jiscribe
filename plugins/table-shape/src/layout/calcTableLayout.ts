import {
	calcWrappedTextBlockSize,
	DEFAULT_FONT_FAMILY,
	SHAPE_STYLE_FALLBACK,
	TEXT_STYLE_FALLBACK,
} from "@jiscribe/canvas-sdk/doc";
import type { TextMeasureFont } from "@jiscribe/canvas-sdk/doc";
import { isRichText, resolveTextSlotStyle } from "@jiscribe/doc";
import type { Rect } from "@jiscribe/geometry";

import {
	TABLE_CELL_STYLE_DEFAULTS,
	TABLE_DOC_DEFAULTS,
	tableCellSlotId,
} from "../schema/TableDoc";
import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * What the grid is derived from: the tracks, the cells filling them, and the rule
 * width the cells give room to. Every field is optional so a calculator declared
 * over this type stays assignable to the registry's `ObjectTextRegionCalculator`
 * (see there); a state missing the tracks lays out as an empty grid rather than
 * throwing.
 */
export type TableLayoutState = {
	/** The columns, left to right; their widths are the only source of the table's own width. */
	columns?: readonly TableColumnDoc[];
	/** The rows, top to bottom; each height is a lower bound the cells may push past. */
	rows?: readonly TableRowDoc[];
	/** The cells, keyed by {@link tableCellSlotId}; a key the grid has no cell for measures as empty. */
	text?: Record<string, TableCell>;
	/** Rule width in px; absent resolves the same way the drawing does (the type's defaults, then SHAPE_STYLE_FALLBACK). */
	strokeWidth?: number;
};

/**
 * The whole geometry of one table, in the shape's local coordinates (origin at
 * its center, top-left based rects) — the same space `calcRecordSlotRegions`
 * answers in.
 *
 * Single source of the table's geometry: the drawing (TableBox), the text
 * placement (calcTableTextRegion, which the overlays and the in-place editor both
 * go through), the outer size the content resizer stores (calcTableFrameSize) and
 * connector attachment all read it, so a rule, a hit region and the text drawn in
 * it cannot drift apart.
 */
export type TableLayout = {
	/**
	 * Left edge of every column with the table's right edge appended:
	 * `columns.length + 1` values, ascending. The inner values are exactly the
	 * vertical rules.
	 */
	columnXs: number[];
	/**
	 * Top edge of every row with the table's bottom edge appended:
	 * `rows.length + 1` values, ascending. The inner values are exactly the
	 * horizontal rules.
	 */
	rowYs: number[];
	/**
	 * One rect per cell of the grid, keyed by {@link tableCellSlotId} in row-major
	 * order. Neighbours share an edge exactly, so the rects tile the table with no
	 * gap and no overlap.
	 */
	cellRects: Record<string, Rect>;
	/** Table width: the column widths summed. */
	width: number;
	/** Table height: the resolved row heights summed. */
	height: number;
};

/**
 * The font one cell's text is drawn — and so measured — with: what the cell
 * states, over the type's cell defaults, over what the overlay draws an unset
 * field with. The family is the last to be filled in because
 * TABLE_CELL_STYLE_DEFAULTS names none, and DEFAULT_FONT_FAMILY is what the
 * overlay then draws in.
 */
const resolveCellFont = (cell: TableCell | undefined): TextMeasureFont => {
	const style = resolveTextSlotStyle(TABLE_CELL_STYLE_DEFAULTS, cell);
	return {
		fontSize: style.fontSize ?? TEXT_STYLE_FALLBACK.fontSize,
		fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
		fontWeight: style.fontWeight ?? TEXT_STYLE_FALLBACK.fontWeight,
		fontStyle: style.fontStyle,
	};
};

/**
 * Height one cell's text asks for: the box the shared measurement gives that text
 * at that width, its padding included. An empty cell still asks for one line,
 * which is what gives a row of empty cells its height.
 *
 * @param cell - The cell, or undefined for a grid position no cell is keyed at
 * @param wrapWidth - Width of the box the text wraps inside, the rules' share already taken off; the text padding is subtracted by the measurement itself
 */
const calcCellTextHeight = (
	cell: TableCell | undefined,
	wrapWidth: number,
): number =>
	calcWrappedTextBlockSize(
		isRichText(cell?.text) ? cell.text : "",
		resolveCellFont(cell),
		wrapWidth,
	).height;

/**
 * Height one row is drawn at: its stored height as the lower bound, raised to
 * whatever its tallest cell asks for. A row whose text outgrows the stored value
 * is drawn taller, never clipped.
 */
const resolveRowHeight = (
	rowIndex: number,
	row: TableRowDoc,
	columns: readonly TableColumnDoc[],
	cells: Record<string, TableCell> | undefined,
	strokeWidth: number,
): number =>
	columns.reduce(
		(tallest, column, columnIndex) =>
			Math.max(
				tallest,
				calcCellTextHeight(
					cells?.[tableCellSlotId(rowIndex, columnIndex)],
					column.width - strokeWidth,
				),
			),
		row.height ?? 0,
	);

/**
 * Rule width the cells are measured against: the same three steps the drawing
 * resolves its stroke through (ObjectShapeStyleDefaultsRegistry), which is what
 * keeps the measured cell and the drawn one the same width.
 */
const resolveTableStrokeWidth = (state: TableLayoutState): number =>
	state.strokeWidth ??
	TABLE_DOC_DEFAULTS.strokeWidth ??
	SHAPE_STYLE_FALLBACK.strokeWidth;

/** Stands in for a row's bound where only its text's own demand is wanted. */
const NO_ROW_BOUND: TableRowDoc = {};

/**
 * The height one row's own text asks for, with its stored bound left out: the floor
 * {@link calcTableLayout} will not draw the row below, however small the bound is.
 * What a boundary drag can squeeze the row to before the table has to grow instead
 * (resolveTableRowBoundaryDrag).
 *
 * @param state - The tracks, the cells and the rule width, as the layout reads them
 * @param rowIndex - Which row to measure; one the grid does not have has no cells to ask, and measures as 0
 * @returns The floor in local px. An empty cell still asks for a line, so only a grid with no columns at all floors at 0
 */
export const calcTableRowTextFloor = (
	state: TableLayoutState,
	rowIndex: number,
): number =>
	resolveRowHeight(
		rowIndex,
		NO_ROW_BOUND,
		state.columns ?? [],
		state.text,
		resolveTableStrokeWidth(state),
	);

/** The running edges of one track: the first edge, then one per size. */
const accumulateEdges = (start: number, sizes: readonly number[]): number[] => {
	const edges = [start];
	let edge = start;
	for (const size of sizes) {
		edge += size;
		edges.push(edge);
	}
	return edges;
};

/**
 * Lays the grid out. The table's own size falls out of it rather than being read
 * from the state: the width is the column widths summed and the height the
 * resolved row heights summed, which is why the doc stores neither (see
 * TableFeatures).
 *
 * A cell's text is measured against its column minus the rule width, so text
 * never has to run under a rule to fit — which makes the row height an upper
 * bound of what the drawn wrap needs, the drawn cell being the full column wide.
 *
 * @param state - The tracks, the cells and the rule width; absent tracks lay out as an empty grid whose rects are `{}`
 * @returns The edges, one rect per cell and the outer size, all in the shape's local coordinates (origin at its center)
 */
export const calcTableLayout = (state: TableLayoutState): TableLayout => {
	const columns = state.columns ?? [];
	const rows = state.rows ?? [];
	const strokeWidth = resolveTableStrokeWidth(state);

	const rowHeights = rows.map((row, rowIndex) =>
		resolveRowHeight(rowIndex, row, columns, state.text, strokeWidth),
	);
	const width = columns.reduce((total, column) => total + column.width, 0);
	const height = rowHeights.reduce((total, rowHeight) => total + rowHeight, 0);

	const columnXs = accumulateEdges(
		-width / 2,
		columns.map((column) => column.width),
	);
	const rowYs = accumulateEdges(-height / 2, rowHeights);

	const cellRects: Record<string, Rect> = {};
	rows.forEach((_, rowIndex) => {
		columns.forEach((column, columnIndex) => {
			cellRects[tableCellSlotId(rowIndex, columnIndex)] = {
				x: columnXs[columnIndex],
				y: rowYs[rowIndex],
				width: column.width,
				height: rowHeights[rowIndex],
			};
		});
	});

	return { columnXs, rowYs, cellRects, width, height };
};
