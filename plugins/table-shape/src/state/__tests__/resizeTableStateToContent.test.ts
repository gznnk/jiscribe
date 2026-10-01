import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { calcTableFrameSize } from "../../layout/calcTableFrameSize";
import { TABLE_MIN_COLUMN_WIDTH, tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { resizeTableStateToContent } from "../resizeTableStateToContent";
import type { TableState } from "../TableState";

// The row heights are resolved from the cells' text, and measuring with nothing
// offered throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a 2x2 grid written out as `[row][column]` text. */
const cellsOf = (rows: string[][]): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	rows.forEach((row, rowIndex) => {
		row.forEach((text, columnIndex) => {
			cells[tableCellSlotId(rowIndex, columnIndex)] = { text };
		});
	});
	return cells;
};

/**
 * A 2x2 table of 120px columns drawn from (380, 375), its box already the one its
 * grid answers for — which is the state every still frame hands the resizer.
 */
const makeTable = (overrides: Partial<TableState> = {}): TableState => {
	const grid = {
		id: "t-1",
		type: "table",
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 120 }, { width: 120 }],
		rows: [{}, {}],
		text: cellsOf([
			["", ""],
			["", ""],
		]),
	};
	const size = calcTableFrameSize(grid);
	return {
		...grid,
		...size,
		cx: 380 + size.width / 2,
		cy: 375 + size.height / 2,
		...overrides,
	} as unknown as TableState;
};

/** Left edge of a table drawn with no rotation and no flip. */
const leftEdgeOf = (table: TableState): number => table.cx - table.width / 2;

/** The box a drag leaves behind: a new width, with the left edge held where it was. */
const draggedRightEdgeTo = (table: TableState, width: number): TableState =>
	makeTable({
		...table,
		width,
		cx: leftEdgeOf(table) + width / 2,
	});

const widthsOf = (table: TableState): number[] =>
	table.columns.map((column) => column.width);

describe("resizeTableStateToContent", () => {
	it("hands back the same state when the box already answers for the grid", () => {
		const table = makeTable();

		expect(resizeTableStateToContent(table)).toBe(table);
	});

	it("grows the box from the drawn corner when the grid is what moved", () => {
		// One cell given more text than its column is wide: its row grows and the
		// table with it, while no column's width is touched.
		const table = makeTable({
			text: cellsOf([
				["aaaaaa aaaaaa", ""],
				["", ""],
			]),
		});
		const resized = resizeTableStateToContent(table);

		expect(resized.width).toBe(240);
		expect(resized.height).toBeGreaterThan(table.height);
		expect(resized.columns).toBe(table.columns);
		expect(resized.cy - resized.height / 2).toBe(375);
	});

	it("takes a width written over the grid as an outside write and distributes it", () => {
		const table = makeTable({ columns: [{ width: 80 }, { width: 160 }] });
		const resized = resizeTableStateToContent(draggedRightEdgeTo(table, 360));

		expect(widthsOf(resized)).toEqual([120, 240]);
		expect(resized.width).toBe(360);
		// The edge that was not dragged stays where it was drawn.
		expect(leftEdgeOf(resized)).toBe(380);
	});

	it("re-wraps the cells at the new column widths, so the height follows", () => {
		const table = makeTable({
			text: cellsOf([
				["aaaaaa aaaaaa", ""],
				["", ""],
			]),
		});
		const wrapped = resizeTableStateToContent(table);
		const widened = resizeTableStateToContent(draggedRightEdgeTo(wrapped, 480));

		expect(widened.width).toBe(480);
		// The text that needed two lines in a 120px column fits one in a 240px one.
		expect(widened.height).toBeLessThan(wrapped.height);
	});

	it("stops at the narrowest grid it can build rather than collapsing", () => {
		const table = makeTable();
		const clamped = resizeTableStateToContent(draggedRightEdgeTo(table, 30));

		expect(widthsOf(clamped)).toEqual([
			TABLE_MIN_COLUMN_WIDTH,
			TABLE_MIN_COLUMN_WIDTH,
		]);
		expect(clamped.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);

		// Dragged further, the derived box goes on winning and nothing narrows.
		const further = resizeTableStateToContent(draggedRightEdgeTo(clamped, 5));
		expect(further.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);
		expect(widthsOf(further)).toEqual(widthsOf(clamped));
	});

	it("settles on a box the next frame hands straight back", () => {
		const table = makeTable({ columns: [{ width: 70 }, { width: 170 }] });
		const resized = resizeTableStateToContent(draggedRightEdgeTo(table, 301));

		// The columns sum to exactly the width that was stored, so the frame after
		// the drag reads no outside write and re-measures nothing.
		expect(resizeTableStateToContent(resized)).toBe(resized);
	});
});
