import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import {
	tableCellTextSlotId,
	tableCellTextSlotIds,
} from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { reconcileTableBoxWithGrid } from "../../state/reconcileTableBoxWithGrid";
import type { TableState } from "../../state/TableState";
import { insertTableGridTrack } from "../insertTableGridTrack";

// The box is re-derived from the cells' text, and measuring with nothing offered
// throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a grid written out as `[row][column]` text. */
const cellsOf = (rows: string[][]): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	rows.forEach((row, rowIndex) => {
		row.forEach((text, columnIndex) => {
			cells[tableCellTextSlotId(rowIndex, columnIndex)] = { text };
		});
	});
	return cells;
};

/** The text of every cell, read back as `[row][column]`. */
const readGrid = (state: TableState): string[][] =>
	state.rows.map((_row, rowIndex) =>
		state.columns.map(
			(_column, columnIndex) =>
				state.text[tableCellTextSlotId(rowIndex, columnIndex)].text as string,
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

describe("insertTableGridTrack", () => {
	it("renumbers every cell below an inserted row and leaves the ones above alone", () => {
		const inserted = insertTableGridTrack(makeTable(), "row", 1);

		expect(inserted.rows).toHaveLength(3);
		expect(readGrid(inserted)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["", "", ""],
			["r1c0", "r1c1", "r1c2"],
		]);
		// The key set is the invariant: exactly the grid's ids, in row-major order.
		expect(Object.keys(inserted.text)).toEqual(tableCellTextSlotIds(3, 3));
	});

	it("renumbers every cell right of an inserted column", () => {
		const inserted = insertTableGridTrack(makeTable(), "column", 1);

		expect(inserted.columns).toHaveLength(4);
		expect(readGrid(inserted)).toEqual([
			["r0c0", "", "r0c1", "r0c2"],
			["r1c0", "", "r1c1", "r1c2"],
		]);
		expect(Object.keys(inserted.text)).toEqual(tableCellTextSlotIds(2, 4));
	});

	it("keeps the rows' stored bounds with the rows they belong to", () => {
		const inserted = insertTableGridTrack(makeTable(), "row", 1, 0);

		expect(inserted.rows).toEqual([
			{ height: 50 },
			{ height: 50 },
			{ height: 70 },
		]);
	});

	it("gives a new row the stored height of the source row, or none when it has none", () => {
		const table = makeTable({ rows: [{}, { height: 70 }] });

		expect(insertTableGridTrack(table, "row", 0, 1).rows).toEqual([
			{ height: 70 },
			{},
			{ height: 70 },
		]);
		expect(insertTableGridTrack(table, "row", 2, 0).rows).toEqual([
			{},
			{ height: 70 },
			{},
		]);
	});

	it("styles each new cell as the source track's cell beside it, without its text", () => {
		const table = makeTable({
			text: {
				...cellsOf([
					["r0c0", "r0c1", "r0c2"],
					["r1c0", "r1c1", "r1c2"],
				]),
				[tableCellTextSlotId(0, 1)]: {
					text: "r0c1",
					fill: "#ffeeaa",
					fontWeight: "bold",
					textAlign: "center",
				},
			},
		});

		// Column 1 picked, inserting left: the new column 1 copies the old column 1.
		const withColumn = insertTableGridTrack(table, "column", 1, 1);
		expect(withColumn.text[tableCellTextSlotId(0, 1)]).toEqual({
			text: "",
			fill: "#ffeeaa",
			fontWeight: "bold",
			textAlign: "center",
		});
		expect(withColumn.text[tableCellTextSlotId(1, 1)]).toEqual({ text: "" });

		// Row 0 picked, inserting below: the new row 1 copies row 0.
		const withRow = insertTableGridTrack(table, "row", 1, 0);
		expect(withRow.text[tableCellTextSlotId(1, 1)]).toEqual({
			text: "",
			fill: "#ffeeaa",
			fontWeight: "bold",
			textAlign: "center",
		});
		// No key set to undefined, so an unstyled source still folds to bare text.
		expect(Object.keys(withRow.text[tableCellTextSlotId(1, 0)])).toEqual([
			"text",
		]);
	});

	it("gives a new column the width of the source column, on either side of it", () => {
		const table = makeTable({
			columns: [{ width: 100 }, { width: 200 }, { width: 300 }],
		});

		// Picking column 1: inserting right lands at 2, left at 1; both copy 200.
		expect(insertTableGridTrack(table, "column", 2, 1).columns).toEqual([
			{ width: 100 },
			{ width: 200 },
			{ width: 200 },
			{ width: 300 },
		]);
		expect(insertTableGridTrack(table, "column", 1, 1).columns).toEqual([
			{ width: 100 },
			{ width: 200 },
			{ width: 200 },
			{ width: 300 },
		]);
		expect(insertTableGridTrack(table, "column", 3, 2).columns).toEqual([
			{ width: 100 },
			{ width: 200 },
			{ width: 300 },
			{ width: 300 },
		]);
	});

	it("without a source column, copies the column standing at the index", () => {
		expect(insertTableGridTrack(makeTable(), "column", 0).columns).toEqual([
			{ width: 80 },
			{ width: 80 },
			{ width: 100 },
			{ width: 120 },
		]);
		// Past the right edge there is no column standing at the index; the last one
		// is copied.
		expect(insertTableGridTrack(makeTable(), "column", 3).columns).toEqual([
			{ width: 80 },
			{ width: 100 },
			{ width: 120 },
			{ width: 120 },
		]);
	});

	it("leaves the box to the resizer, which widens the table by the new column from its drawn corner", () => {
		const table = makeTable();
		const unreconciled = insertTableGridTrack(table, "column", 1);
		expect(unreconciled.width).toBe(table.width);

		const inserted = reconcileTableBoxWithGrid(unreconciled, {});
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
		expect(insertTableGridTrack(makeTable(), "row", -5).rows).toHaveLength(3);
		expect(readGrid(insertTableGridTrack(makeTable(), "row", 99))).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r1c0", "r1c1", "r1c2"],
			["", "", ""],
		]);
	});

	it("leaves the table it was given untouched", () => {
		const table = makeTable();
		insertTableGridTrack(table, "row", 0);
		insertTableGridTrack(table, "column", 0);

		expect(table.rows).toHaveLength(2);
		expect(table.columns).toHaveLength(3);
		expect(Object.keys(table.text)).toEqual(tableCellTextSlotIds(2, 3));
	});
});
