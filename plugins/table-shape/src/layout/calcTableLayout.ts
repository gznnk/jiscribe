import { SHAPE_STYLE_FALLBACK } from "@jiscribe/canvas-sdk/doc";
import type { Rect } from "@jiscribe/geometry";

import { readCachedCellTextHeight } from "./readCachedCellTextHeight";
import { readTableCellTextSlotIdRow } from "../schema/tableCellTextSlotIdCache";
import {
	TABLE_DOC_DEFAULTS,
	TABLE_MIN_COLUMN_WIDTH,
	TABLE_MIN_ROW_HEIGHT,
} from "../schema/TableDoc";
import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * The fields of a table state the grid is derived from: the tracks, the cells
 * filling them, and the rule width the cells give room to (the document-shaped
 * twin is TableDocLayoutSource). Every field is optional so a calculator declared
 * over this type stays assignable to the registry's `ObjectTextSlotRegionsCalculator`
 * (see there); a source missing the tracks lays out as an empty grid rather than
 * throwing.
 */
export type TableLayoutSource = {
	/** The columns, left to right; their widths are the only source of the table's own width. */
	columns?: readonly TableColumnDoc[];
	/** The rows, top to bottom; each height is a lower bound the cells may push past. */
	rows?: readonly TableRowDoc[];
	/** The cells, keyed by {@link import("../schema/TableDoc").tableCellTextSlotId}; a key the grid has no cell for measures as empty. */
	text?: Record<string, TableCell>;
	/** Rule width in px; absent resolves the same way the drawing does (the type's defaults, then SHAPE_STYLE_FALLBACK). */
	strokeWidth?: number;
};

/**
 * The whole geometry of one table, in the shape's local coordinates (origin at
 * its center, top-left based rects) — the same space `calcRecordTextSlotRegions`
 * answers in.
 *
 * Single source of the table's geometry: the drawing (Table), the text
 * placement (calcTableTextSlotRegions, which the overlays and the in-place editor both
 * go through), the outer size the content resizer stores (calcTableFrameSize) and
 * connector attachment all read it, so a rule, a hit region and the text drawn in
 * it cannot drift apart. Read-only throughout: one layout object is shared by
 * every reader of the same grid (readCachedTableLayout), so a write would reach
 * them all.
 */
export type TableLayout = {
	/**
	 * Left edge of every column with the table's right edge appended:
	 * `columns.length + 1` values, ascending. The inner values are exactly the
	 * vertical rules.
	 */
	readonly columnEdgeXs: readonly number[];
	/**
	 * Top edge of every row with the table's bottom edge appended:
	 * `rows.length + 1` values, ascending. The inner values are exactly the
	 * horizontal rules.
	 */
	readonly rowEdgeYs: readonly number[];
	/**
	 * One rect per cell of the grid, keyed by {@link import("../schema/TableDoc").tableCellTextSlotId} in row-major
	 * order. Neighbours share an edge exactly, so the rects tile the table with no
	 * gap and no overlap.
	 */
	readonly cellRects: Readonly<Record<string, Readonly<Rect>>>;
	/**
	 * Lowest each row can be drawn at whatever its stored bound: what its tallest
	 * cell's text asks for, never under {@link TABLE_MIN_ROW_HEIGHT}. One per row,
	 * top to bottom; the row is drawn at the greater of this and its bound.
	 */
	readonly rowFloors: readonly number[];
	/** Table width: the column widths summed. */
	readonly width: number;
	/** Table height: the resolved row heights summed. */
	readonly height: number;
};

/**
 * Lowest one row can be drawn at: what its tallest cell's text asks for, never
 * under {@link TABLE_MIN_ROW_HEIGHT}. The row's stored bound raises it, never
 * lowers it, so text is never clipped.
 */
const calcRowFloor = (
	rowCellIds: readonly string[],
	columns: readonly TableColumnDoc[],
	cells: Record<string, TableCell> | undefined,
	strokeWidth: number,
): number =>
	columns.reduce(
		(tallest, column, columnIndex) =>
			Math.max(
				tallest,
				readCachedCellTextHeight(
					cells?.[rowCellIds[columnIndex]],
					column.width - strokeWidth,
				),
			),
		TABLE_MIN_ROW_HEIGHT,
	);

/**
 * Rule width the cells are measured against: the same three steps the drawing
 * resolves its stroke through (ObjectShapeStyleDefaultsRegistry), which is what
 * keeps the measured cell and the drawn one the same width.
 */
const resolveTableStrokeWidth = (state: TableLayoutSource): number =>
	state.strokeWidth ??
	TABLE_DOC_DEFAULTS.strokeWidth ??
	SHAPE_STYLE_FALLBACK.strokeWidth;

/**
 * The table's width: the column widths summed, which is all of the layout the
 * width is — no cell is measured for it, so the content resizer can tell whether a
 * dragged width differs from the columns before it lays the table out.
 *
 * @param columns - The columns, left to right; none sums to 0
 */
export const calcTableColumnsWidth = (
	columns: readonly TableColumnDoc[],
): number => columns.reduce((total, column) => total + column.width, 0);

/**
 * Narrowest the table can be drawn: every column at {@link TABLE_MIN_COLUMN_WIDTH}.
 * Also what the table hands the transform frame as its `minWidth`
 * (reconcileTableBoxWithGrid), so a dragged edge stops there with the opposite
 * edge held.
 *
 * @param columns - The columns, left to right; none gives 0
 */
export const calcTableMinWidth = (columns: readonly TableColumnDoc[]): number =>
	columns.length * TABLE_MIN_COLUMN_WIDTH;

/**
 * Lowest the table can be drawn at its current column widths: every row at its
 * floor. The height twin of {@link calcTableMinWidth}, handed to the transform
 * frame as `minHeight` (reconcileTableBoxWithGrid) so a dragged top edge stops
 * there with the bottom edge held.
 *
 * @param layout - The table's layout; its `rowFloors` are summed, so no rows gives 0
 */
export const calcTableMinHeight = (layout: TableLayout): number =>
	layout.rowFloors.reduce((total, floor) => total + floor, 0);

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
 * Each cell is measured once per cell object and width (readCachedCellTextHeight),
 * so a pass measures only the cells it has not seen at that width.
 *
 * @param state - The tracks, the cells and the rule width; absent tracks lay out as an empty grid whose rects are `{}`
 * @returns The edges, one rect per cell and the outer size, all in the shape's local coordinates (origin at its center)
 */
export const calcTableLayout = (state: TableLayoutSource): TableLayout => {
	const columns = state.columns ?? [];
	const rows = state.rows ?? [];
	const strokeWidth = resolveTableStrokeWidth(state);

	const cellIdsByRow = rows.map((_, rowIndex) =>
		readTableCellTextSlotIdRow(rowIndex, columns.length),
	);
	const rowFloors = rows.map((_, rowIndex) =>
		calcRowFloor(cellIdsByRow[rowIndex], columns, state.text, strokeWidth),
	);
	const rowHeights = rows.map((row, rowIndex) =>
		Math.max(row.height ?? 0, rowFloors[rowIndex]),
	);
	const width = calcTableColumnsWidth(columns);
	const height = rowHeights.reduce((total, rowHeight) => total + rowHeight, 0);

	const columnEdgeXs = accumulateEdges(
		-width / 2,
		columns.map((column) => column.width),
	);
	const rowEdgeYs = accumulateEdges(-height / 2, rowHeights);

	const cellRects: Record<string, Rect> = {};
	rows.forEach((_, rowIndex) => {
		columns.forEach((column, columnIndex) => {
			cellRects[cellIdsByRow[rowIndex][columnIndex]] = {
				x: columnEdgeXs[columnIndex],
				y: rowEdgeYs[rowIndex],
				width: column.width,
				height: rowHeights[rowIndex],
			};
		});
	});

	return { columnEdgeXs, rowEdgeYs, cellRects, rowFloors, width, height };
};
