/**
 * Every cell id a layout has asked for, as `[row][column]`. Grow-only: an id is
 * the same string for the life of the process, so a layout pass, run every frame
 * of a drag, reads its ids rather than building one string per cell. Filled only
 * by {@link readTableCellTextSlotIdRow}, whose counts come from a grid that
 * exists; a single id asked for is formatted, not stored, so an arbitrary
 * position cannot grow it.
 */
const cellIdRows: string[][] = [];

/**
 * One cell's slot id, `r${row}c${column}` (see tableCellTextSlotId, which
 * delegates here).
 *
 * @param row - Row index, 0-based from the top
 * @param column - Column index, 0-based from the left
 * @returns The id a layout already stored for that position, or a newly formatted one of the same spelling
 */
export const readTableCellTextSlotId = (row: number, column: number): string =>
	cellIdRows[row]?.[column] ?? `r${row}c${column}`;

/** Formats one row's ids afresh, for a row the store does not take. */
const formatIdRow = (row: number, columnCount: number): string[] =>
	Array.from({ length: columnCount }, (_unused, column) => `r${row}c${column}`);

/**
 * The cell ids of one row, left to right, from the shared store, which is filled
 * up to `columnCount` first.
 *
 * The store grows a row at a time, as a layout walks its rows from the top; a row
 * that would leave a gap (or is no grid index at all) is formatted afresh and not
 * stored, which keeps the store a dense array however far off a row is asked for.
 *
 * @param row - Row index, 0-based from the top
 * @param columnCount - How many ids the caller reads; 0 reads none
 * @returns The ids, read only. A stored row holds at least `columnCount` ids, more when a wider grid filled it, so read indices below `columnCount` alone
 */
export const readTableCellTextSlotIdRow = (
	row: number,
	columnCount: number,
): readonly string[] => {
	let idRow = cellIdRows[row];
	if (idRow === undefined) {
		if (!Number.isInteger(row) || row < 0 || row > cellIdRows.length) {
			return formatIdRow(row, columnCount);
		}
		idRow = [];
		cellIdRows.push(idRow);
	}
	for (let column = idRow.length; column < columnCount; column++) {
		idRow.push(`r${row}c${column}`);
	}
	return idRow;
};
