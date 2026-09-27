import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { TABLE_CELL_FONT_SIZE, tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { calcTableFrameSize } from "../calcTableFrameSize";
import { calcTableLayout } from "../calcTableLayout";
import type { TableLayoutState } from "../calcTableLayout";

// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (see @jiscribe/canvas-sdk/doc). A table's rows are sized from their own
// text, so this suite measures; without a browser it runs on the estimate —
// characters x fontSize x 0.6 — stated here rather than left to a fallback. A
// package-wide setup file would have to be the only offer site: a second, different
// estimate offer throws.
offerTextMeasurement(createEstimateTextMeasurement());

/**
 * Height a cell of the given line count asks for: the line boxes plus the shared
 * vertical text padding, at the cell's default type size.
 */
const cellHeightOf = (lineCount: number): number =>
	lineCount * TABLE_CELL_FONT_SIZE * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

/** The cells of a grid written out as `[row][column]` text, keyed the way state keys them. */
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
 * A table whose rules are 1px wide, so every cell of a 120px column wraps at
 * 120 - 1 - 6 * 2 = 107px — 12 characters at the estimate's 8.4px each, which is
 * what the wrapping cases below are written against.
 */
const tableOf = (
	columnWidths: number[],
	rowHeights: (number | undefined)[],
	cellTexts: string[][],
): TableLayoutState => ({
	columns: columnWidths.map((width) => ({ width })),
	rows: rowHeights.map((height) => ({ height })),
	text: cellsOf(cellTexts),
	strokeWidth: 1,
});

describe("calcTableLayout", () => {
	it("gives a row of empty cells one line's height", () => {
		const { height, cellRects } = calcTableLayout(
			tableOf([120, 120], [undefined], [["", ""]]),
		);
		expect(height).toBe(cellHeightOf(1));
		expect(cellRects[tableCellSlotId(0, 0)].height).toBe(cellHeightOf(1));
	});

	it("a row with no stored height is exactly as tall as its text", () => {
		const { height } = calcTableLayout(
			tableOf([120, 120], [undefined], [["ab", ""]]),
		);
		expect(height).toBe(cellHeightOf(1));
	});

	it("grows a row past its stored height when the text needs it", () => {
		// 13 characters = 109.2px, past the 107px the column leaves, and the word
		// boundary puts the second word on a line of its own.
		const { rowYs, height } = calcTableLayout(
			tableOf([120, 120], [30], [["aaaaaa aaaaaa", ""]]),
		);
		expect(height).toBe(cellHeightOf(2));
		expect(rowYs).toEqual([-height / 2, height / 2]);
	});

	it("keeps the stored height where it is taller than the text", () => {
		const { height } = calcTableLayout(
			tableOf([120, 120], [60], [["aaaaaa aaaaaa", ""]]),
		);
		expect(height).toBe(60);
	});

	it("the same text in a wider column stays on one line", () => {
		const { height } = calcTableLayout(
			tableOf([200, 120], [undefined], [["aaaaaa aaaaaa", ""]]),
		);
		expect(height).toBe(cellHeightOf(1));
	});

	it("takes the row's tallest cell", () => {
		const { height } = calcTableLayout(
			tableOf([120, 120], [undefined], [["ab", "aaaaaa aaaaaa"]]),
		);
		expect(height).toBe(cellHeightOf(2));
	});

	it("leaves the rules room, so a wider rule can be what wraps the text", () => {
		// 11 characters = 92.4px: inside the 107px a 1px rule leaves, past the 88px
		// a 20px one does.
		const cellTexts = [["aaaaa aaaaa"]];
		const withThinRule = calcTableLayout({
			...tableOf([120], [undefined], cellTexts),
			strokeWidth: 1,
		});
		const withThickRule = calcTableLayout({
			...tableOf([120], [undefined], cellTexts),
			strokeWidth: 20,
		});
		expect(withThinRule.height).toBe(cellHeightOf(1));
		expect(withThickRule.height).toBe(cellHeightOf(2));
	});

	it("measures a grid position with no cell of its own as an empty one", () => {
		const { height } = calcTableLayout({
			columns: [{ width: 120 }],
			rows: [{}],
			strokeWidth: 1,
		});
		expect(height).toBe(cellHeightOf(1));
	});

	it("sizes the table from the column widths and the resolved row heights", () => {
		const state = tableOf(
			[110, 90],
			[36, undefined],
			[
				["", ""],
				["", ""],
			],
		);
		const { width, height } = calcTableLayout(state);
		expect(width).toBe(200);
		expect(height).toBe(36 + cellHeightOf(1));
		expect(calcTableFrameSize(state)).toEqual({ width, height });
	});

	it("places the edges from the table's center outwards", () => {
		const { columnXs, rowYs } = calcTableLayout(
			tableOf(
				[110, 90],
				[36, undefined],
				[
					["", ""],
					["", ""],
				],
			),
		);
		expect(columnXs).toEqual([-100, 10, 100]);
		expect(rowYs).toEqual([-30.5, 5.5, 30.5]);
	});

	it("gives every cell the rect its column and row meet in", () => {
		const { cellRects } = calcTableLayout(
			tableOf(
				[110, 90],
				[36, undefined],
				[
					["", ""],
					["", ""],
				],
			),
		);
		expect(cellRects).toEqual({
			r0c0: { x: -100, y: -30.5, width: 110, height: 36 },
			r0c1: { x: 10, y: -30.5, width: 90, height: 36 },
			r1c0: { x: -100, y: 5.5, width: 110, height: cellHeightOf(1) },
			r1c1: { x: 10, y: 5.5, width: 90, height: cellHeightOf(1) },
		});
	});

	it("leaves no gap and no overlap between neighbouring cells", () => {
		const { cellRects, columnXs, rowYs } = calcTableLayout(
			tableOf(
				[110, 90, 70],
				[36, undefined],
				[
					["", "aaaaaa aaaaaa", ""],
					["", "", ""],
				],
			),
		);
		const topLeft = cellRects.r0c0;
		expect(topLeft.x + topLeft.width).toBe(cellRects.r0c1.x);
		expect(cellRects.r0c1.x + cellRects.r0c1.width).toBe(cellRects.r0c2.x);
		expect(topLeft.y + topLeft.height).toBe(cellRects.r1c0.y);
		// The cells fill the table exactly: the last edges are its own.
		expect(cellRects.r0c2.x + cellRects.r0c2.width).toBe(columnXs[3]);
		expect(cellRects.r1c0.y + cellRects.r1c0.height).toBe(rowYs[2]);
	});

	it("keys the cells row by row, left to right", () => {
		const { cellRects } = calcTableLayout(
			tableOf(
				[110, 90],
				[undefined, undefined],
				[
					["", ""],
					["", ""],
				],
			),
		);
		expect(Object.keys(cellRects)).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
	});
});
