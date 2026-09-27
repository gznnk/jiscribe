import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { calcTableLayout } from "../../layout/calcTableLayout";
import type { TableLayoutState } from "../../layout/calcTableLayout";
import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { calcTableTextRegion } from "../calcTableTextRegion";

// Text measurement is offered, never inferred, and measuring with nothing offered
// throws (see @jiscribe/canvas-sdk/doc). A table's rows are sized from their own
// text, so this suite measures; without a browser it runs on the estimate —
// characters x fontSize x 0.6 — stated here rather than left to a fallback. A
// package-wide setup file would have to be the only offer site: a second, different
// estimate offer throws.
offerTextMeasurement(createEstimateTextMeasurement());

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

describe("calcTableTextRegion", () => {
	it("returns the rect of the cell the slot id names", () => {
		const state = {
			...tableOf(
				[110, 90],
				[36, undefined],
				[
					["", ""],
					["", ""],
				],
			),
			width: 200,
			height: 61,
		};
		expect(calcTableTextRegion(state, "r1c1")).toEqual(
			calcTableLayout(state).cellRects.r1c1,
		);
	});

	it("falls back to the table's own box for a slot id the grid has no cell for", () => {
		const state = {
			...tableOf([110, 90], [36], [["", ""]]),
			width: 200,
			height: 36,
		};
		expect(calcTableTextRegion(state, "r9c9")).toEqual({
			x: -100,
			y: -18,
			width: 200,
			height: 36,
		});
	});
});
