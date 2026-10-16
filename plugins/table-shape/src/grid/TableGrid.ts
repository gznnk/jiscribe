import type {
	TableCell,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * The part of a table the grid operations rearrange: the two axes and the cells
 * keyed by tableCellTextSlotId. A TableState is one, and so is what readTableDocGrid
 * reads off a document, which is how the canvas and the AI tools share the
 * operations. Its keys are exactly `tableCellTextSlotIds(rows.length,
 * columns.length)`, the same invariant TableState states.
 */
export type TableGrid = {
	/** The columns, left to right. */
	columns: TableColumnDoc[];
	/** The rows, top to bottom. */
	rows: TableRowDoc[];
	/** The cells, keyed by tableCellTextSlotId in row-major order. */
	text: Record<string, TableCell>;
};
