import { describe, expect, it } from "vitest";

import { TABLE_MIN_COLUMN_WIDTH } from "../../schema/TableDoc";
import type { TableColumnDoc } from "../../schema/TableDoc";
import { distributeTableWidthToColumns } from "../distributeTableWidthToColumns";

const columnsOf = (widths: number[]): TableColumnDoc[] =>
	widths.map((width) => ({ width }));

const widthsOf = (columns: TableColumnDoc[] | null): number[] =>
	(columns ?? []).map((column) => column.width);

const sumOf = (columns: TableColumnDoc[] | null): number =>
	widthsOf(columns).reduce((total, width) => total + width, 0);

describe("distributeTableWidthToColumns", () => {
	it("keeps each column's share of the total", () => {
		const resized = distributeTableWidthToColumns(columnsOf([80, 160]), 360);

		expect(widthsOf(resized)).toEqual([120, 240]);
	});

	it("leaves the columns it was given alone, entries included", () => {
		const startColumns = [{ width: 120 }, { width: 120 }];
		const resized = distributeTableWidthToColumns(startColumns, 300);

		expect(widthsOf(resized)).toEqual([150, 150]);
		expect(resized?.[0]).not.toBe(startColumns[0]);
		expect(widthsOf(startColumns)).toEqual([120, 120]);
	});

	it("sums to the width asked for even where the shares do not round", () => {
		const resized = distributeTableWidthToColumns(columnsOf([10, 10, 10]), 100);

		// Three shares of 33.3333 fall 0.0001 short; one column takes the residue.
		expect(sumOf(resized)).toBeCloseTo(100, 9);
		expect(widthsOf(resized).sort((a, b) => a - b)).toEqual([
			33.3333, 33.3333, 33.3334,
		]);
	});

	it("holds a column that would fall under the minimum, at the rest's expense", () => {
		const resized = distributeTableWidthToColumns(columnsOf([200, 40]), 60);

		// The narrow column's share would be 10; pinned at 24, it leaves 36 for the
		// other, which is the whole of what is left rather than its own 50.
		expect(widthsOf(resized)).toEqual([36, TABLE_MIN_COLUMN_WIDTH]);
		expect(sumOf(resized)).toBe(60);
	});

	it("pins the column one pass uncovers after pinning another", () => {
		// The middle column's first share is 28.6 and clears the minimum; once the
		// narrow one is pinned it falls to 21 and has to be pinned in its turn.
		const resized = distributeTableWidthToColumns(columnsOf([50, 30, 4]), 80);

		expect(widthsOf(resized)).toEqual([
			80 - TABLE_MIN_COLUMN_WIDTH * 2,
			TABLE_MIN_COLUMN_WIDTH,
			TABLE_MIN_COLUMN_WIDTH,
		]);
		expect(sumOf(resized)).toBe(80);
	});

	it("cannot go under the grid's own minimum, and builds it there instead", () => {
		const resized = distributeTableWidthToColumns(columnsOf([120, 120]), 10);

		expect(widthsOf(resized)).toEqual([
			TABLE_MIN_COLUMN_WIDTH,
			TABLE_MIN_COLUMN_WIDTH,
		]);
		expect(sumOf(resized)).toBe(TABLE_MIN_COLUMN_WIDTH * 2);
	});

	it("splits evenly across columns that have no width to keep a share of", () => {
		const resized = distributeTableWidthToColumns(columnsOf([0, 0]), 100);

		expect(widthsOf(resized)).toEqual([50, 50]);
	});

	it("gives a single column the whole width", () => {
		expect(
			widthsOf(distributeTableWidthToColumns(columnsOf([100]), 250)),
		).toEqual([250]);
	});

	it("returns null when no column's width would change", () => {
		expect(
			distributeTableWidthToColumns(columnsOf([120, 120]), 240),
		).toBeNull();
		// Already at the floor, so a narrower request changes nothing either.
		expect(
			distributeTableWidthToColumns(
				columnsOf([TABLE_MIN_COLUMN_WIDTH, TABLE_MIN_COLUMN_WIDTH]),
				10,
			),
		).toBeNull();
	});

	it("returns null for a grid with no columns to distribute into", () => {
		expect(distributeTableWidthToColumns([], 240)).toBeNull();
	});
});
