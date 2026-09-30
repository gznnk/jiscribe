import { parseTableCellSlotId, tableCellSlotId } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/**
 * The cells a Shift-click widens the pick to: the rectangle the anchor and the
 * clicked cell stand at opposite corners of, which is what a grid means by "the
 * run between two cells". Core's default would take the slice of the slot order
 * between them instead, and that order being row by row, a two-row reach would
 * drag in every cell to the right of the anchor's row.
 *
 * Registered as the `range` of the table's `"textSlot"` part (see
 * {@link import("../definition").tableDefinition}).
 *
 * @param state - The table the two ids name cells of; read only, and the grid it
 *   holds now is what decides which of them still exist
 * @param anchorCellId - The corner the range is measured from, the cell a plain
 *   click last left picked; which of the two corners comes first in the grid does
 *   not matter
 * @param focusCellId - The other corner, the cell just clicked
 * @returns The rectangle's cells row by row from the upper row, left to right
 *   within a row — the order `state.text` keys them in — or `[focusCellId]` alone
 *   when either id is not a cell id or the rectangle has outlived the grid, a
 *   stale corner collapsing the pick rather than widening it to something
 *   arbitrary
 */
export const collectTableCellRange = (
	state: TableState,
	anchorCellId: string,
	focusCellId: string,
): string[] => {
	const anchor = parseTableCellSlotId(anchorCellId);
	const focus = parseTableCellSlotId(focusCellId);
	if (anchor === null || focus === null) {
		return [focusCellId];
	}
	const lastRow = Math.max(anchor.row, focus.row);
	const lastColumn = Math.max(anchor.column, focus.column);
	const cellIds: string[] = [];
	for (let row = Math.min(anchor.row, focus.row); row <= lastRow; row++) {
		for (
			let column = Math.min(anchor.column, focus.column);
			column <= lastColumn;
			column++
		) {
			const cellId = tableCellSlotId(row, column);
			if (Object.prototype.hasOwnProperty.call(state.text, cellId)) {
				cellIds.push(cellId);
			}
		}
	}
	return cellIds.length === 0 ? [focusCellId] : cellIds;
};
