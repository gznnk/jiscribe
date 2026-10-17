import { describe, expect, it } from "vitest";

import {
	readTableCellTextSlotId,
	readTableCellTextSlotIdRow,
} from "../tableCellTextSlotIdCache";
import { tableCellTextSlotId } from "../TableDoc";

/** The spelling the ids had before they were stored. */
const formatId = (row: number, column: number): string => `r${row}c${column}`;

describe("readTableCellTextSlotIdRow", () => {
	it("gives each row's ids in the cell id spelling, left to right", () => {
		for (let row = 0; row < 4; row++) {
			expect(readTableCellTextSlotIdRow(row, 3).slice(0, 3)).toEqual([
				formatId(row, 0),
				formatId(row, 1),
				formatId(row, 2),
			]);
		}
	});

	it("hands back the same stored row on every read, so no id is built twice", () => {
		const first = readTableCellTextSlotIdRow(0, 2);
		const second = readTableCellTextSlotIdRow(0, 2);

		expect(second).toBe(first);
	});

	it("widens a stored row in place for a wider grid, keeping the ids it had", () => {
		const narrow = readTableCellTextSlotIdRow(1, 2);
		const narrowIds = [...narrow];
		const wideCount = narrowIds.length + 4;

		const wide = readTableCellTextSlotIdRow(1, wideCount);

		expect(wide).toBe(narrow);
		expect(wide.slice(0, narrowIds.length)).toEqual(narrowIds);
		expect(wide.slice(0, wideCount)).toEqual(
			Array.from({ length: wideCount }, (_unused, column) =>
				formatId(1, column),
			),
		);
	});

	it("formats a row that would leave a gap afresh rather than storing it", () => {
		const farRow = 1_000_000;

		const first = readTableCellTextSlotIdRow(farRow, 2);
		const second = readTableCellTextSlotIdRow(farRow, 2);

		expect(first).toEqual([formatId(farRow, 0), formatId(farRow, 1)]);
		expect(second).not.toBe(first);
	});

	it("formats a position that is no grid index the way the ids always were", () => {
		expect(readTableCellTextSlotIdRow(-1, 2)).toEqual(["r-1c0", "r-1c1"]);
		expect(readTableCellTextSlotIdRow(0.5, 1)).toEqual(["r0.5c0"]);
	});
});

describe("tableCellTextSlotId", () => {
	it("spells every position as before, stored or not", () => {
		readTableCellTextSlotIdRow(0, 2);
		const positions: [number, number][] = [
			[0, 0],
			[0, 1],
			[0, 7],
			[3, 2],
			[-1, 0],
			[0, -1],
			[2.5, 1],
			[1_000_000, 4],
		];

		for (const [row, column] of positions) {
			expect(tableCellTextSlotId(row, column)).toBe(formatId(row, column));
		}
	});

	it("reads a stored id rather than formatting one", () => {
		const idRow = readTableCellTextSlotIdRow(0, 3);

		expect(readTableCellTextSlotId(0, 2)).toBe(idRow[2]);
	});
});
