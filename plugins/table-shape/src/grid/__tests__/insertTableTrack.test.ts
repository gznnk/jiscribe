import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tableCellSlotId, tableCellSlotIds } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { insertTableTrack } from "../insertTableTrack";

// The box is re-derived from the cells' text, and measuring with nothing offered
// throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a grid written out as `[row][column]` text. */
const cellsOf = (rows: string[][]): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	rows.forEach((row, rowIndex) => {
		row.forEach((text, columnIndex) => {
			cells[tableCellSlotId(rowIndex, columnIndex)] = { text };
		});
	});
	return cells;
};

/** The text of every cell, read back as `[row][column]`. */
const readGrid = (state: TableState): string[][] =>
	state.rows.map((_row, rowIndex) =>
		state.columns.map(
			(_column, columnIndex) =>
				state.text[tableCellSlotId(rowIndex, columnIndex)].text as string,
		),
	);

/**
 * A 3x2 table whose every cell says where it is, so a renumbering that moves a
 * cell one place along is visible rather than merely plausible. Columns of
 * distinct widths, for the same reason.
 */
const makeTable = (overrides: Partial<TableState> = {}): TableState =>
	({
		id: "t-1",
		type: "table",
		cx: 500,
		cy: 400,
		width: 300,
		height: 150,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 80 }, { width: 100 }, { width: 120 }],
		rows: [{ height: 50 }, { height: 70 }],
		text: cellsOf([
			["r0c0", "r0c1", "r0c2"],
			["r1c0", "r1c1", "r1c2"],
		]),
		...overrides,
	}) as unknown as TableState;

describe("insertTableTrack", () => {
	it("renumbers every cell below an inserted row and leaves the ones above alone", () => {
		const inserted = insertTableTrack(makeTable(), "row", 1);

		expect(inserted.rows).toHaveLength(3);
		expect(readGrid(inserted)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["", "", ""],
			["r1c0", "r1c1", "r1c2"],
		]);
		// The key set is the invariant: exactly the grid's ids, in row-major order.
		expect(Object.keys(inserted.text)).toEqual(tableCellSlotIds(3, 3));
	});

	it("renumbers every cell right of an inserted column", () => {
		const inserted = insertTableTrack(makeTable(), "column", 1);

		expect(inserted.columns).toHaveLength(4);
		expect(readGrid(inserted)).toEqual([
			["r0c0", "", "r0c1", "r0c2"],
			["r1c0", "", "r1c1", "r1c2"],
		]);
		expect(Object.keys(inserted.text)).toEqual(tableCellSlotIds(2, 4));
	});

	it("keeps the rows' stored bounds with the rows they belong to", () => {
		const inserted = insertTableTrack(makeTable(), "row", 1);

		// The new row stores none, so it is drawn at whatever one empty line asks for.
		expect(inserted.rows).toEqual([{ height: 50 }, {}, { height: 70 }]);
	});

	it("gives a new column the width of the one it was put next to", () => {
		expect(insertTableTrack(makeTable(), "column", 0).columns).toEqual([
			{ width: 80 },
			{ width: 80 },
			{ width: 100 },
			{ width: 120 },
		]);
		// Past the right edge there is no column standing at the index; the last one
		// is what it was put next to.
		expect(insertTableTrack(makeTable(), "column", 3).columns).toEqual([
			{ width: 80 },
			{ width: 100 },
			{ width: 120 },
			{ width: 120 },
		]);
	});

	it("widens the table by the new column and leaves its drawn corner where it was", () => {
		const table = makeTable();
		const inserted = insertTableTrack(table, "column", 1);

		expect(inserted.width).toBe(table.width + 100);
		expect(inserted.cx - inserted.width / 2).toBeCloseTo(
			table.cx - table.width / 2,
			6,
		);
		expect(inserted.cy - inserted.height / 2).toBeCloseTo(
			table.cy - table.height / 2,
			6,
		);
	});

	it("clamps an index outside the grid rather than leaving a hole", () => {
		expect(insertTableTrack(makeTable(), "row", -5).rows).toHaveLength(3);
		expect(readGrid(insertTableTrack(makeTable(), "row", 99))).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r1c0", "r1c1", "r1c2"],
			["", "", ""],
		]);
	});

	it("leaves the table it was given untouched", () => {
		const table = makeTable();
		insertTableTrack(table, "row", 0);
		insertTableTrack(table, "column", 0);

		expect(table.rows).toHaveLength(2);
		expect(table.columns).toHaveLength(3);
		expect(Object.keys(table.text)).toEqual(tableCellSlotIds(2, 3));
	});
});
