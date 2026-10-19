import { describe, expect, it } from "vitest";

import { tableCellTextSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { collectTableTrackCellIds } from "../collectTableTrackCellIds";

/** The cells of a grid, all empty. */
const emptyCells = (
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			cells[tableCellTextSlotId(row, column)] = { text: "" };
		}
	}
	return cells;
};

/** A 2x3 table; only the grid matters here. */
const makeTable = (): TableState =>
	({
		id: "t-1",
		type: "table",
		cx: 0,
		cy: 0,
		width: 300,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
		rows: [{ height: 50 }, { height: 50 }],
		text: emptyCells(2, 3),
	}) as unknown as TableState;

describe("collectTableTrackCellIds", () => {
	it("covers the cells of a track, in the order the grid keys them", () => {
		const table = makeTable();

		expect(collectTableTrackCellIds(table, "row", ["1"])).toEqual([
			"r1c0",
			"r1c1",
			"r1c2",
		]);
		expect(collectTableTrackCellIds(table, "column", ["2"])).toEqual([
			"r0c2",
			"r1c2",
		]);
	});

	it("covers the cells of every track named, taken together", () => {
		const table = makeTable();

		expect(collectTableTrackCellIds(table, "column", ["0", "1"])).toEqual([
			"r0c0",
			"r1c0",
			"r0c1",
			"r1c1",
		]);
	});

	it("covers nothing for a part id that is not an index", () => {
		expect(collectTableTrackCellIds(makeTable(), "row", ["x"])).toEqual([]);
	});
});
