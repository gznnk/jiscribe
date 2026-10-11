import { describe, expect, it } from "vitest";

import type { TableCell } from "../../schema/TableDoc";
import { tableCellSlotIds } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { collectTableCellRange } from "../collectTableCellRange";

/** A grid of empty cells; only `text` is read, the box playing no part in a range. */
const makeTable = (rowCount: number, columnCount: number): TableState => {
	const text: Record<string, TableCell> = {};
	for (const cellId of tableCellSlotIds(rowCount, columnCount)) {
		text[cellId] = { text: "" };
	}
	return { id: "t-1", type: "table", text } as unknown as TableState;
};

describe("collectTableCellRange", () => {
	it("takes the rectangle the two corners span, not the row-major run between them", () => {
		expect(collectTableCellRange(makeTable(3, 3), "r0c0", "r1c1")).toEqual([
			"r0c0",
			"r0c1",
			"r1c0",
			"r1c1",
		]);
	});

	it("reads the same rectangle from either corner, in the grid's own order", () => {
		expect(collectTableCellRange(makeTable(3, 3), "r2c2", "r1c1")).toEqual([
			"r1c1",
			"r1c2",
			"r2c1",
			"r2c2",
		]);
		expect(collectTableCellRange(makeTable(3, 3), "r0c2", "r1c0")).toEqual([
			"r0c0",
			"r0c1",
			"r0c2",
			"r1c0",
			"r1c1",
			"r1c2",
		]);
	});

	it("gives the one cell back when both corners are it", () => {
		expect(collectTableCellRange(makeTable(2, 2), "r1c0", "r1c0")).toEqual([
			"r1c0",
		]);
	});

	it("drops cells the grid has outgrown", () => {
		// The anchor names a column that was removed; what is left of its rectangle
		// is still a rectangle of the cells that remain.
		expect(collectTableCellRange(makeTable(2, 2), "r0c5", "r1c1")).toEqual([
			"r0c1",
			"r1c1",
		]);
	});

	it("collapses to the clicked cell when the anchor is not a cell id at all", () => {
		expect(collectTableCellRange(makeTable(2, 2), "body", "r1c1")).toEqual([
			"r1c1",
		]);
	});

	it("collapses to the clicked cell when nothing of the rectangle is left", () => {
		expect(collectTableCellRange(makeTable(2, 2), "r4c4", "r3c3")).toEqual([
			"r3c3",
		]);
	});
});
