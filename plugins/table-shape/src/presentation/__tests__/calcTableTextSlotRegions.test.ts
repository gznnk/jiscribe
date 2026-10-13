import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { calcTableLayout } from "../../layout/calcTableLayout";
import type { TableLayoutSource } from "../../layout/calcTableLayout";
import { tableCellTextSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { calcTableTextSlotRegions } from "../calcTableTextSlotRegions";

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
			cells[tableCellTextSlotId(rowIndex, columnIndex)] = { text };
		});
	});
	return cells;
};

/** A table whose rules are 1px wide. */
const tableOf = (
	columnWidths: number[],
	rowHeights: (number | undefined)[],
	cellTexts: string[][],
): TableLayoutSource => ({
	columns: columnWidths.map((width) => ({ width })),
	rows: rowHeights.map((height) => ({ height })),
	text: cellsOf(cellTexts),
	strokeWidth: 1,
});

describe("calcTableTextSlotRegions", () => {
	it("answers the rect of every cell, keyed by the cell's slot id", () => {
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
		const regions = calcTableTextSlotRegions(state);

		expect(Object.keys(regions)).toEqual(["r0c0", "r0c1", "r1c0", "r1c1"]);
		expect(regions.r1c1).toEqual(calcTableLayout(state).cellRects.r1c1);
	});
});
