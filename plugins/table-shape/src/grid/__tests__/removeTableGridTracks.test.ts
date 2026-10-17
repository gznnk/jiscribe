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
import { removeTableGridTracks } from "../removeTableGridTracks";

// The box is re-derived from the cells' text (see calcTableLayout.test.ts).
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

/** A 3x3 table whose every cell says where it started. */
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
		rows: [{ height: 40 }, { height: 50 }, { height: 60 }],
		text: cellsOf([
			["r0c0", "r0c1", "r0c2"],
			["r1c0", "r1c1", "r1c2"],
			["r2c0", "r2c1", "r2c2"],
		]),
		...overrides,
	}) as unknown as TableState;

describe("removeTableGridTracks", () => {
	it("removes a row and pulls the ones below it up", () => {
		const removed = removeTableGridTracks(makeTable(), "row", [1]);

		expect(removed).not.toBeNull();
		expect(readGrid(removed as TableState)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r2c0", "r2c1", "r2c2"],
		]);
		expect((removed as TableState).rows).toEqual([
			{ height: 40 },
			{ height: 60 },
		]);
		expect(Object.keys((removed as TableState).text)).toEqual(
			tableCellTextSlotIds(2, 3),
		);
	});

	it("removes a column and pulls the ones right of it left", () => {
		const removed = removeTableGridTracks(makeTable(), "column", [0]);

		expect(readGrid(removed as TableState)).toEqual([
			["r0c1", "r0c2"],
			["r1c1", "r1c2"],
			["r2c1", "r2c2"],
		]);
		expect((removed as TableState).columns).toEqual([
			{ width: 100 },
			{ width: 120 },
		]);
	});

	it("takes several tracks at once, in whatever order they are named", () => {
		const removed = removeTableGridTracks(makeTable(), "row", [2, 0]);

		expect(readGrid(removed as TableState)).toEqual([["r1c0", "r1c1", "r1c2"]]);
	});

	it("refuses a removal that would leave no row or no column", () => {
		expect(removeTableGridTracks(makeTable(), "row", [0, 1, 2])).toBeNull();
		expect(removeTableGridTracks(makeTable(), "column", [0, 1, 2])).toBeNull();

		const oneRow = makeTable({
			rows: [{ height: 40 }],
			text: cellsOf([["r0c0", "r0c1", "r0c2"]]),
		});
		expect(removeTableGridTracks(oneRow, "row", [0])).toBeNull();
	});

	it("refuses when nothing it names is in the grid", () => {
		expect(removeTableGridTracks(makeTable(), "row", [])).toBeNull();
		expect(removeTableGridTracks(makeTable(), "row", [7])).toBeNull();
		expect(removeTableGridTracks(makeTable(), "row", [-1])).toBeNull();
	});

	it("leaves the box to the resizer, which narrows the table by the removed column from its drawn corner", () => {
		const table = makeTable();
		const unreconciled = removeTableGridTracks(
			table,
			"column",
			[1],
		) as TableState;
		expect(unreconciled.width).toBe(table.width);

		const removed = reconcileTableBoxWithGrid(unreconciled, {});
		expect(removed.width).toBe(table.width - 100);
		expect(removed.cx - removed.width / 2).toBeCloseTo(
			table.cx - table.width / 2,
			6,
		);
	});

	it("leaves the table it was given untouched", () => {
		const table = makeTable();
		removeTableGridTracks(table, "row", [0]);

		expect(table.rows).toHaveLength(3);
		expect(Object.keys(table.text)).toEqual(tableCellTextSlotIds(3, 3));
	});
});
