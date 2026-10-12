import { objectFieldEntry, resolveTextSlotIds } from "@jiscribe/canvas-sdk";
import type { DeclaredStyleEntry } from "@jiscribe/canvas-sdk";

import type { TableCell } from "../schema/TableDoc";
import { UNFILLED_CELL_FILL } from "../schema/TableDoc";
import type { TableState } from "../state/TableState";

/** The table's own background, exactly as the entries `features.fill` derives. */
const tableBackgroundFillEntry = objectFieldEntry<TableState, "fill">("fill");

/**
 * Fill, following the selection: with nothing picked inside the table it is the
 * table's own background, as derived; with cells, rows or columns picked it is
 * the `fill` of those cells (resolveTextSlotIds, which asks the picked kind), each
 * read on its own so cells
 * that disagree report as mixed.
 *
 * A cell is never given its `fill` back to omitted from here: the transparent
 * swatch stores `"transparent"`, and a cell without one reads as that same value.
 */
export const tableFillEntry: DeclaredStyleEntry<TableState, string> = {
	apply: (table, pick, color, ctx) => {
		if (pick === null) {
			return tableBackgroundFillEntry.apply(table, pick, color, ctx);
		}
		const cellIds = resolveTextSlotIds(table, pick, ctx);
		if (cellIds.length === 0) {
			return null;
		}
		const updatedCells: Record<string, TableCell> = { ...table.text };
		let changed = false;
		for (const cellId of cellIds) {
			const cell = table.text[cellId];
			if (cell === undefined || Object.is(cell.fill, color)) {
				continue;
			}
			updatedCells[cellId] = { ...cell, fill: color };
			changed = true;
		}
		return changed ? { ...table, text: updatedCells } : table;
	},
	read: (table, pick, ctx) => {
		if (pick === null) {
			return tableBackgroundFillEntry.read(table, pick, ctx);
		}
		const fills: string[] = [];
		for (const cellId of resolveTextSlotIds(table, pick, ctx)) {
			const cell = table.text[cellId];
			if (cell !== undefined) {
				fills.push(cell.fill ?? UNFILLED_CELL_FILL);
			}
		}
		return fills;
	},
	fields: ["fill", "text"],
};
