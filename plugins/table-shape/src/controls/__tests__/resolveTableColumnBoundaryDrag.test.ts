import { describe, expect, it } from "vitest";

import { TABLE_MIN_COLUMN_WIDTH } from "../../schema/TableDoc";
import type { TableColumnDoc } from "../../schema/TableDoc";
import { resolveTableColumnBoundaryDrag } from "../resolveTableColumnBoundaryDrag";

/** The table's own width: what a boundary drag must never change. */
const tableWidthOf = (columns: readonly TableColumnDoc[]): number =>
	columns.reduce((total, column) => total + column.width, 0);

const columnsOf = (...widths: number[]): TableColumnDoc[] =>
	widths.map((width) => ({ width }));

describe("resolveTableColumnBoundaryDrag", () => {
	it("gives the dragged distance to one column and takes it from the next", () => {
		const resized = resolveTableColumnBoundaryDrag(columnsOf(120, 120), 0, 30);
		expect(resized).toEqual(columnsOf(150, 90));
	});

	it("moves the pair the other way for a negative drag", () => {
		const resized = resolveTableColumnBoundaryDrag(columnsOf(120, 120), 0, -30);
		expect(resized).toEqual(columnsOf(90, 150));
	});

	it("touches no column but the two the boundary sits between", () => {
		const resized = resolveTableColumnBoundaryDrag(
			columnsOf(80, 120, 100, 60),
			1,
			25,
		);
		expect(resized).toEqual(columnsOf(80, 145, 75, 60));
	});

	it("keeps the table's width whatever the drag, in both directions and past both clamps", () => {
		const startColumns = columnsOf(90, 140, 70);
		const startWidth = tableWidthOf(startColumns);
		for (const boundaryIndex of [0, 1]) {
			for (const localDeltaX of [
				-4000, -211.75, -30, -0.0001, 0, 0.0001, 47.5, 212, 4000,
			]) {
				const resized = resolveTableColumnBoundaryDrag(
					startColumns,
					boundaryIndex,
					localDeltaX,
				);
				expect(resized).not.toBeNull();
				// The whole point of the gesture: the outer box does not move, so the
				// sum the resizer re-derives it from is the one it already had.
				expect(tableWidthOf(resized ?? [])).toBeCloseTo(startWidth, 6);
				for (const column of resized ?? []) {
					expect(column.width).toBeGreaterThanOrEqual(TABLE_MIN_COLUMN_WIDTH);
				}
			}
		}
	});

	it("stops both columns together at the minimum, rather than letting the table shrink", () => {
		const resized = resolveTableColumnBoundaryDrag(
			columnsOf(120, 120),
			0,
			10_000,
		);
		expect(resized).toEqual(
			columnsOf(240 - TABLE_MIN_COLUMN_WIDTH, TABLE_MIN_COLUMN_WIDTH),
		);
	});

	it("stops at the minimum on the leading side too", () => {
		const resized = resolveTableColumnBoundaryDrag(
			columnsOf(120, 120),
			0,
			-10_000,
		);
		expect(resized).toEqual(
			columnsOf(TABLE_MIN_COLUMN_WIDTH, 240 - TABLE_MIN_COLUMN_WIDTH),
		);
	});

	it("rewrites the columns rather than mutating the ones it was given", () => {
		const startColumns = columnsOf(120, 120);
		resolveTableColumnBoundaryDrag(startColumns, 0, 30);
		expect(startColumns).toEqual(columnsOf(120, 120));
	});

	it("refuses a boundary the grid does not have", () => {
		const startColumns = columnsOf(120, 120, 120);
		// The last column's right edge is the table's own, not a boundary.
		expect(resolveTableColumnBoundaryDrag(startColumns, 2, 30)).toBeNull();
		expect(resolveTableColumnBoundaryDrag(startColumns, -1, 30)).toBeNull();
		expect(resolveTableColumnBoundaryDrag(columnsOf(120), 0, 30)).toBeNull();
	});

	it("refuses a pair with no room for two minimums, since a write there would widen the table", () => {
		const tooNarrow = columnsOf(
			TABLE_MIN_COLUMN_WIDTH,
			TABLE_MIN_COLUMN_WIDTH - 1,
		);
		expect(resolveTableColumnBoundaryDrag(tooNarrow, 0, 5)).toBeNull();
	});
});
