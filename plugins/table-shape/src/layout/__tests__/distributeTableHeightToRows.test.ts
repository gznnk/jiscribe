import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import {
	TABLE_CELL_FONT_SIZE,
	tableCellTextSlotId,
} from "../../schema/TableDoc";
import type { TableCell, TableRowDoc } from "../../schema/TableDoc";
import { calcTableLayout } from "../calcTableLayout";
import type { TableLayoutSource } from "../calcTableLayout";
import { distributeTableHeightToRows } from "../distributeTableHeightToRows";

// The floors are the rows' own text, and measuring with nothing offered throws
// (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** Height a cell of the given line count asks for, at the default type size. */
const cellHeightOf = (lineCount: number): number =>
	lineCount * TABLE_CELL_FONT_SIZE * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

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

/**
 * One 120px column of 1px rules, so a cell wraps at 12 characters (see
 * calcTableLayout.test.ts) and `"aaaaaa aaaaaa"` takes two lines.
 */
const tableOf = (
	rowHeights: (number | undefined)[],
	cellTexts: string[],
): TableLayoutSource => ({
	columns: [{ width: 120 }],
	rows: rowHeights.map((height) => (height === undefined ? {} : { height })),
	text: cellsOf(cellTexts.map((text) => [text])),
	strokeWidth: 1,
});

const TWO_LINES = "aaaaaa aaaaaa";

const heightsOf = (rows: TableRowDoc[] | null): (number | undefined)[] =>
	(rows ?? []).map((row) => row.height);

/** The heights `rows` are drawn at in `table`. */
const drawnHeightsOf = (
	table: TableLayoutSource,
	rows: TableRowDoc[] | null,
): number[] => {
	const { rowEdgeYs } = calcTableLayout({ ...table, rows: rows ?? [] });
	return rowEdgeYs.slice(1).map((edge, index) => edge - rowEdgeYs[index]);
};

describe("distributeTableHeightToRows", () => {
	it("grows the rows in the proportions they hold", () => {
		const resized = distributeTableHeightToRows(
			tableOf([40, 80], ["", ""]),
			240,
		);

		expect(heightsOf(resized)).toEqual([80, 160]);
	});

	it("reads the proportions off the drawn heights, not the stored bounds", () => {
		// The first row stores no bound; its two lines of text are what it is drawn at.
		const startTable = tableOf(
			[undefined, 2 * cellHeightOf(2)],
			[TWO_LINES, ""],
		);
		const resized = distributeTableHeightToRows(
			startTable,
			6 * cellHeightOf(2),
		);

		expect(heightsOf(resized)).toEqual([
			2 * cellHeightOf(2),
			4 * cellHeightOf(2),
		]);
	});

	it("stops a shrink at the rows' text, pinning the row its text holds", () => {
		const startTable = tableOf([100, 100], [TWO_LINES, ""]);
		const floor = cellHeightOf(2);
		const resized = distributeTableHeightToRows(startTable, floor + 30);

		// Half of floor + 30 is below the floor, so the row is pinned there and the
		// other takes what is left, which clears its own one line.
		expect(drawnHeightsOf(startTable, resized)).toEqual([floor, 30]);
	});

	it("drops the bound of a row pinned at its floor, and keeps the size of one above it", () => {
		const startTable = tableOf([100, 100], [TWO_LINES, ""]);
		const resized = distributeTableHeightToRows(
			startTable,
			cellHeightOf(2) + 30,
		);

		expect(resized?.[0]).toEqual({});
		expect(heightsOf(resized)).toEqual([undefined, 30]);
		// So once the text goes, the row is drawn at one empty line.
		const cleared = { ...startTable, text: cellsOf([[""], [""]]) };
		expect(drawnHeightsOf(cleared, resized)[0]).toBe(cellHeightOf(1));
	});

	it("keeps a row's other fields when it drops its bound", () => {
		const startTable: TableLayoutSource = {
			...tableOf([100, 100], [TWO_LINES, ""]),
			rows: [{ height: 100, extra: "kept" } as TableRowDoc, { height: 100 }],
		};
		const resized = distributeTableHeightToRows(startTable, 10);

		expect(resized?.[0]).toEqual({ extra: "kept" });
	});

	it("drops every bound when asked for exactly the floors summed", () => {
		const startTable = tableOf([100, 60], [TWO_LINES, ""]);
		const resized = distributeTableHeightToRows(
			startTable,
			cellHeightOf(2) + cellHeightOf(1),
		);

		expect(resized).toEqual([{}, {}]);
	});

	it("builds the grid at the floors, with no bounds, when asked for less than they sum to", () => {
		const startTable = tableOf([100, 100], [TWO_LINES, ""]);
		const resized = distributeTableHeightToRows(startTable, 10);

		expect(drawnHeightsOf(startTable, resized)).toEqual([
			cellHeightOf(2),
			cellHeightOf(1),
		]);
		expect(resized).toEqual([{}, {}]);
	});

	it("sums to the height asked for even where the shares do not round", () => {
		const resized = distributeTableHeightToRows(
			tableOf([30, 30, 30], ["", "", ""]),
			100,
		);
		const heights = heightsOf(resized) as number[];

		expect(heights.reduce((total, height) => total + height, 0)).toBeCloseTo(
			100,
			9,
		);
		expect([...heights].sort((left, right) => left - right)).toEqual([
			33.3333, 33.3333, 33.3334,
		]);
	});

	it("returns null when no row's bound would change", () => {
		expect(
			distributeTableHeightToRows(tableOf([40, 80], ["", ""]), 120),
		).toBeNull();
	});

	it("keeps the entry of a row whose bound is unchanged, an absent one included", () => {
		const startTable = tableOf([undefined, 40], ["", ""]);
		const startRows = startTable.rows ?? [];
		// The first row is at its floor and stores none, before and after; the
		// second is pinned at its floor too, and drops the 40 it stored.
		const resized = distributeTableHeightToRows(startTable, 0);

		expect(resized?.[0]).toBe(startRows[0]);
		expect(resized?.[1]).toEqual({});
	});

	it("keeps the entry of a row above its floor whose size is unchanged", () => {
		// The first row is drawn at its text over a lower bound, so the height asked
		// for leaves it at that floor and the second exactly the 100 it stores.
		const startTable = tableOf([10, 100], [TWO_LINES, ""]);
		const startRows = startTable.rows ?? [];
		const resized = distributeTableHeightToRows(
			startTable,
			cellHeightOf(2) + 100,
		);

		expect(resized?.[0]).toEqual({});
		expect(resized?.[1]).toBe(startRows[1]);
	});

	it("returns null for a grid with no rows", () => {
		expect(distributeTableHeightToRows(tableOf([], []), 100)).toBeNull();
	});
});
