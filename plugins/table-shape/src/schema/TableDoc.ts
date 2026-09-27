import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import { DEFAULT_STROKE_WIDTH } from "@jiscribe/doc";
import type {
	CreateObjectType,
	ObjectFeatures,
	RichText,
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc";

/**
 * A grid of cells. `geometry: "point"` because the doc stores where the table is
 * drawn from and nothing about its size: the width is the column widths summed,
 * and the height the resolved row heights summed (see calcTableLayout), so a
 * stored pair could only ever disagree with them.
 *
 * `fill: false` — a table has no background of its own. A cell carries its own
 * (see {@link TableCell}), and a table-wide one would sit behind cells that
 * already cover it.
 *
 * `text: "slots"` describes the **state**, where each cell is one text slot
 * keyed by {@link tableCellSlotId}. The doc spells the same cells out as a grid
 * (`cells`) instead of a keyed map, so that a table reads as a table in the
 * file; the mapper is what moves between the two forms.
 */
export const TableFeatures = {
	type: "table",
	geometry: "point",
	transform: true,
	stroke: true,
	fill: false,
	text: "slots",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * One cell: a text slot that also carries a background. Shared verbatim between
 * doc and state (as `TextSlot` itself is), so the mapper only ever moves cells
 * between the grid and the keyed map without touching what is inside one.
 *
 * `fill` is the type's own field on a slot. Every shared slot writer copies a
 * slot with `{ ...slot }` and so preserves it; `tableCellFill.test.ts` is what
 * holds that true (see the design memo).
 */
export type TableCell = TextSlot<RichText> & {
	/** Cell background, any CSS color; omitted draws no background. */
	fill?: string;
};

/**
 * A cell as a document may write it: the whole object, or just its text when
 * nothing about it is styled. Reading accepts both and `toDoc` writes the short
 * form back wherever a cell carries text alone, so a plain grid stays plain.
 */
export type TableCellDoc = RichText | TableCell;

/** One column. The width is stored because nothing derives it. */
export type TableColumnDoc = {
	/** Column width in px, at least {@link TABLE_MIN_COLUMN_WIDTH}. */
	width: number;
};

/** One row. The height is a lower bound, never the drawn height. */
export type TableRowDoc = {
	/**
	 * Lowest the row may be drawn, in px. Omitted lets the row be exactly as tall
	 * as its tallest cell's text needs; a row whose text outgrows this value is
	 * drawn taller, never clipped.
	 */
	height?: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TableDocBrand: unique symbol;

export type TableDoc = CreateObjectType<
	typeof TableFeatures,
	typeof TableDocBrand,
	{
		columns: TableColumnDoc[];
		rows: TableRowDoc[];
		/** `[row][column]`, exactly `rows.length` by `columns.length`. */
		cells: TableCellDoc[][];
	}
>;

/** Doc fields the type carries beyond what its features imply. */
export const TABLE_EXTRA_KEYS = [
	"columns",
	"rows",
	"cells",
] as const satisfies readonly (keyof TableDoc)[];

/**
 * Narrowest a column may be, in px. Two cells' worth of the shared horizontal
 * text padding plus one character's room: below this a cell has no width left to
 * wrap text in, and every line would overflow whatever the text said.
 */
export const TABLE_MIN_COLUMN_WIDTH = 24;

/**
 * Lowest a row's stored height may be, in px. Zero rather than a text's height:
 * the value is a floor the cells raise, so a row asking for nothing is exactly as
 * tall as what it holds.
 */
export const TABLE_MIN_ROW_HEIGHT = 0;

/** Text size a cell is drawn at unless it says otherwise. */
export const TABLE_CELL_FONT_SIZE = 14;

/**
 * What every cell's omitted typography resolves to. One value for all of them
 * rather than a map keyed by cell id, the cells being as many as the grid is
 * wide and tall (see the `EVERY_TEXT_SLOT_ID` entry in the doc definition).
 *
 * `fontColor` is `AUTO_COLOR` so cell text follows the theme; left unset it
 * would resolve to the shared fallback's literal black and stay black on a dark
 * canvas.
 */
export const TABLE_CELL_STYLE_DEFAULTS = {
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: TABLE_CELL_FONT_SIZE,
	fontWeight: "normal",
} as const satisfies TextSlotStyle;

/**
 * The slot id one cell is keyed by in state, and the name its `data-part` carries.
 * Never written to a document: the grid position is what the file holds, and the
 * ids are rebuilt from it on every read, so inserting a row renames nothing the
 * file can see.
 *
 * The `r` / `c` are not decoration. An integer-like key ("0", "1", …) is refused
 * by the slot map, JS enumerating such keys in numeric order ahead of the
 * insertion order and so reordering the cells (see TextSlots).
 *
 * @param row - Row index, 0-based from the top
 * @param column - Column index, 0-based from the left
 * @returns The slot id, e.g. `r0c2` for the third cell of the first row
 */
export const tableCellSlotId = (row: number, column: number): string =>
	`r${row}c${column}`;

/**
 * The cell ids of a grid, in the order they are keyed into state: row by row
 * from the top, left to right within a row. That order is what makes the first
 * key the top-left cell (the slot Enter opens) and what Tab walks.
 *
 * @param rowCount - Number of rows; 0 yields an empty list
 * @param columnCount - Number of columns; 0 yields an empty list
 * @returns Freshly built ids the caller may keep
 */
export const tableCellSlotIds = (
	rowCount: number,
	columnCount: number,
): string[] => {
	const ids: string[] = [];
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			ids.push(tableCellSlotId(row, column));
		}
	}
	return ids;
};

/**
 * Theme-derived doc defaults for a newly created table: a 2x2 grid of empty
 * cells. The cells are written out as the short form, which is what a table
 * carrying no styling saves as.
 */
export const TABLE_DOC_DEFAULTS: Omit<TableDoc, "id"> = {
	type: "table",
	x: 0,
	y: 0,
	// Typed rather than left to `as const`, which would make these readonly
	// tuples and stop them overlapping the doc's arrays (as in RecordDoc).
	columns: [{ width: 120 }, { width: 120 }] as TableColumnDoc[],
	rows: [{}, {}] as TableRowDoc[],
	cells: [
		["", ""],
		["", ""],
	] as TableCellDoc[][],
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
} as const as TableDoc;
