import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { createTableTrackPartDefinition } from "../tableTrackParts";

// `region` lays the grid out, and measuring with nothing offered throws.
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a grid, all empty, so every row is one line tall. */
const emptyCells = (
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			cells[tableCellSlotId(row, column)] = { text: "" };
		}
	}
	return cells;
};

/** A 2x3 table of 100px columns and 50px rows, centered at the origin. */
const makeTable = (overrides: Partial<TableState> = {}): TableState =>
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
		...overrides,
	}) as unknown as TableState;

const rowPart = createTableTrackPartDefinition("row");
const columnPart = createTableTrackPartDefinition("column");

describe("createTableTrackPartDefinition", () => {
	it("registers under the axis's own kind, apart from the cells", () => {
		expect(rowPart.kind).toBe("row");
		expect(columnPart.kind).toBe("column");
	});

	it("has only the indices the grid holds, and only as plain integers", () => {
		const table = makeTable();

		expect(rowPart.has(table, "0")).toBe(true);
		expect(rowPart.has(table, "1")).toBe(true);
		expect(rowPart.has(table, "2")).toBe(false);
		expect(rowPart.has(table, "-1")).toBe(false);
		expect(rowPart.has(table, "0.5")).toBe(false);
		expect(columnPart.has(table, "2")).toBe(true);
		expect(columnPart.has(table, "3")).toBe(false);
	});

	it("lists every track in order", () => {
		const table = makeTable();

		expect(rowPart.list?.(table)).toEqual(["0", "1"]);
		expect(columnPart.list?.(table)).toEqual(["0", "1", "2"]);
	});

	it("outlines the whole band a track covers", () => {
		const table = makeTable();

		expect(rowPart.region?.(table, "1")).toEqual({
			x: -150,
			y: 0,
			width: 300,
			height: 50,
		});
		expect(columnPart.region?.(table, "0")).toEqual({
			x: -150,
			y: -50,
			width: 100,
			height: 100,
		});
		expect(rowPart.region?.(table, "9")).toBeNull();
	});

	it("deletes the named tracks", () => {
		const deleted = rowPart.delete?.(makeTable(), ["0"]) as TableState;

		expect(deleted.rows).toHaveLength(1);
		expect(Object.keys(deleted.text)).toEqual(["r0c0", "r0c1", "r0c2"]);
	});

	it("refuses to take the last row or the last column", () => {
		const oneRow = makeTable({
			rows: [{ height: 50 }],
			height: 50,
			text: emptyCells(1, 3),
		});
		expect(rowPart.delete?.(oneRow, ["0"])).toBeNull();

		const oneColumn = makeTable({
			columns: [{ width: 100 }],
			width: 100,
			text: emptyCells(2, 1),
		});
		expect(columnPart.delete?.(oneColumn, ["0"])).toBeNull();
	});
});
