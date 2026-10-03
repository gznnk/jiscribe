import type { Dimensions } from "@jiscribe/geometry";

import { calcTableFrameSize } from "./calcTableFrameSize";
import { mapCellsToSlots } from "../schema/mapCellsToSlots";
import type {
	TableCellDoc,
	TableColumnDoc,
	TableRowDoc,
} from "../schema/TableDoc";

/**
 * The fields of a table document its size is derived from. Every one is optional
 * because the factory measures a doc it is still assembling, and a missing axis
 * measures as an empty grid rather than throwing.
 */
export type TableDocLayoutSource = {
	/** The columns, left to right; their widths are the only source of the table's own width. */
	columns?: readonly TableColumnDoc[];
	/** The grid as the file writes it, `[row][column]`; either cell form is accepted. */
	cells?: readonly (readonly TableCellDoc[])[];
	/** The rows, top to bottom; each stored height is a lower bound the cells may push past. */
	rows?: readonly TableRowDoc[];
	/** Rule width in px; absent resolves the way the drawing resolves it (calcTableLayout). */
	strokeWidth?: number;
};

/**
 * Outer size of a table read straight from a document, for the one caller holding no
 * state to measure: the factory, which needs the box to place a new table by its
 * center. The grid goes through the same layout the state side measures with
 * ({@link calcTableFrameSize}), so a table created and a table loaded are the same size.
 *
 * @param doc - A table doc, or the defaults and overrides one is about to be built from
 * @returns The size in local pixels, the cells' text padding included; `0 x 0` for a doc with no axes
 */
export const calcTableDocFrameSize = (doc: TableDocLayoutSource): Dimensions =>
	calcTableFrameSize({
		columns: doc.columns,
		rows: doc.rows,
		strokeWidth: doc.strokeWidth,
		text: mapCellsToSlots(
			doc.cells ?? [],
			doc.rows?.length ?? 0,
			doc.columns?.length ?? 0,
		),
	});
