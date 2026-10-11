import { isRichText, normalizeRichText } from "@jiscribe/doc";

import { tableCellSlotId } from "./TableDoc";
import type { TableCell, TableCellDoc } from "./TableDoc";

/**
 * One cell in the form everything but the file holds it: the whole object, its text in
 * canonical form. Typography is deliberately left as written — an omitted field is
 * resolved per read against TABLE_CELL_STYLE_DEFAULTS, so materializing it here would
 * put five fields per cell into a document that never wrote them.
 */
const normalizeCell = (cell: TableCellDoc | undefined): TableCell => {
	if (cell === undefined) {
		return { text: "" };
	}
	if (isRichText(cell)) {
		return { text: normalizeRichText(cell) };
	}
	return { ...cell, text: normalizeRichText(cell.text) };
};

/**
 * The grid a document writes as the keyed slot map the text machinery reads, and the
 * measurement with it (calcTableLayout). Keyed off the axes rather than off `cells`, in
 * the row-major order the slot map's key order has to be: that order makes the first key
 * the top-left cell (the one Enter opens) and is what Tab walks (TextSlots). A cell the
 * grid claims but `cells` does not hold becomes an empty one, so the key set matches the
 * axes whatever the document said — the mismatch itself is the doc validator's to report
 * (validateTableFields).
 *
 * @param cells - The grid as written, `[row][column]`, either cell form accepted; a row or a cell it is missing reads as empty
 * @param rowCount - Rows the axes claim, which is `rows.length` rather than the grid's own
 * @param columnCount - Columns the axes claim, likewise `columns.length`
 * @returns A fresh map, one entry per grid position, its key order row-major
 */
export const mapCellsToSlots = (
	cells: readonly (readonly TableCellDoc[])[],
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const slots: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			slots[tableCellSlotId(row, column)] = normalizeCell(cells[row]?.[column]);
		}
	}
	return slots;
};
