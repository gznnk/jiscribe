import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
	TEXT_BOX_PADDING_Y,
	TEXT_LINE_HEIGHT,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { calcTableLayout } from "../../../layout/calcTableLayout";
import type { TableLayoutSource } from "../../../layout/calcTableLayout";
import {
	TABLE_CELL_FONT_SIZE,
	tableCellTextSlotId,
} from "../../../schema/TableDoc";
import type { TableCell, TableRowDoc } from "../../../schema/TableDoc";
import { calcTableRowBoundaryDrag } from "../calcTableRowBoundaryDrag";

// Measuring with nothing offered throws, and a row's text floor is the whole
// subject here, so the estimate — characters x fontSize x 0.6 — is stated rather
// than left to a fallback (the same offer calcTableLayout's suite makes).
offerTextMeasurement(createEstimateTextMeasurement());

/** Height a cell of the given line count asks for, at the cell's default type size. */
const cellHeightOf = (lineCount: number): number =>
	lineCount * TABLE_CELL_FONT_SIZE * TEXT_LINE_HEIGHT + TEXT_BOX_PADDING_Y * 2;

/** Text that wraps onto two lines in a 120px column: 13 characters past the 107px it leaves. */
const TWO_LINE_TEXT = "aaaaaa aaaaaa";

/** The cells of a one-column grid, keyed the way state keys them. */
const cellsOf = (texts: string[]): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	texts.forEach((text, rowIndex) => {
		cells[tableCellTextSlotId(rowIndex, 0)] = { text };
	});
	return cells;
};

/** A single-column table whose rules are 1px wide, so its cells wrap at 107px. */
const tableOf = (
	rowHeights: (number | undefined)[],
	cellTexts: string[] = rowHeights.map(() => ""),
): TableLayoutSource => ({
	columns: [{ width: 120 }],
	rows: rowHeights.map((height) => ({ height })),
	text: cellsOf(cellTexts),
	strokeWidth: 1,
});

/** Where the boundary is drawn, as the height of the row above it. */
const drawnHeightsOf = (table: TableLayoutSource): number[] => {
	const { rowEdgeYs } = calcTableLayout(table);
	return rowEdgeYs.slice(1).map((y, index) => y - rowEdgeYs[index]);
};

/**
 * The table after its rows were rewritten, for measuring what the drag actually
 * drew. A resolver that declined fails here rather than laying out the table it
 * started from and quietly passing.
 */
const withRows = (
	table: TableLayoutSource,
	rows: TableRowDoc[] | null,
): TableLayoutSource => {
	expect(rows).not.toBeNull();
	return { ...table, rows: rows ?? [] };
};

describe('calcTableRowBoundaryDrag in "pair" mode', () => {
	it("trades height between the two rows while both stay above their text", () => {
		const startTable = tableOf([60, 60]);
		const rows = calcTableRowBoundaryDrag(startTable, 0, 20, "pair");

		expect(rows).toEqual([{ height: 80 }, { height: 40 }]);
		// Neither row is anywhere near its one-line floor, so the trade is exact and
		// the table is the height it was.
		expect(drawnHeightsOf(withRows(startTable, rows))).toEqual([80, 40]);
		expect(calcTableLayout(withRows(startTable, rows)).height).toBe(
			calcTableLayout(startTable).height,
		);
	});

	it("moves the boundary from where it is drawn, not from the bound the row stored", () => {
		// The first row stores nothing, so it is drawn at its one line's height; a
		// 10px drag has to land 10px below that, not 10px below zero.
		const startTable = tableOf([undefined, 60]);
		const rows = calcTableRowBoundaryDrag(startTable, 0, 10, "pair");

		expect(rows?.[0].height).toBe(cellHeightOf(1) + 10);
		expect(drawnHeightsOf(withRows(startTable, rows))[0]).toBe(
			cellHeightOf(1) + 10,
		);
	});

	it("grows the table instead of clipping a row already down at its text", () => {
		// The second row stores no bound, so it is drawn at exactly its one line and
		// has nothing left to give.
		const startTable = tableOf([60, undefined]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, 30, "pair");
		const resizedTable = withRows(startTable, rows);

		// The bound goes on falling — clamped at zero, never negative — so dragging
		// back up restores it rather than leaving the row stuck at its text.
		expect(rows).toEqual([{ height: 90 }, { height: 0 }]);
		// The boundary still followed the cursor its whole 30px, and the row below it
		// is still drawn at its one line: the table is what grew.
		expect(drawnHeightsOf(resizedTable)).toEqual([90, cellHeightOf(1)]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight + 30);
	});

	it("gives only what the row has left, and grows the table by the rest", () => {
		// 15px of headroom above the one-line floor, against a 30px drag.
		const startTable = tableOf([60, cellHeightOf(1) + 15]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, 30, "pair");
		const resizedTable = withRows(startTable, rows);

		expect(rows).toEqual([{ height: 90 }, { height: cellHeightOf(1) - 15 }]);
		expect(drawnHeightsOf(resizedTable)).toEqual([90, cellHeightOf(1)]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight + 15);
	});

	it("reads the floor off the row's own text, not off an empty row's line", () => {
		// The second row's cell wraps onto two lines, so its floor is two lines high
		// and the trade stops there rather than at one.
		const startTable = tableOf([60, undefined], ["", TWO_LINE_TEXT]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, 30, "pair");
		const resizedTable = withRows(startTable, rows);

		expect(rows).toEqual([{ height: 90 }, { height: cellHeightOf(2) - 30 }]);
		expect(drawnHeightsOf(resizedTable)).toEqual([90, cellHeightOf(2)]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight + 30);
	});

	it("takes the drag out of the row above for a negative one", () => {
		const startTable = tableOf([60, 60]);
		expect(calcTableRowBoundaryDrag(startTable, 0, -20, "pair")).toEqual([
			{ height: 40 },
			{ height: 80 },
		]);
	});

	it("stops at the text of the row above instead of growing the row below", () => {
		// The first row stores nothing and wraps onto two lines, so it is drawn at
		// that floor and cannot give the 30px asked of it.
		const startTable = tableOf([undefined, 60], [TWO_LINE_TEXT, ""]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, -30, "pair");
		const resizedTable = withRows(startTable, rows);

		// The bound goes on falling, so dragging back down restores it; the row below
		// is the one that must not move, the table's top edge being its anchor.
		expect(rows).toEqual([{ height: cellHeightOf(2) - 30 }, { height: 60 }]);
		expect(drawnHeightsOf(resizedTable)).toEqual([cellHeightOf(2), 60]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight);
	});

	it("grows the table only downwards, whichever way and however far it is dragged", () => {
		const startTable = tableOf([undefined, undefined], [TWO_LINE_TEXT, "a"]);
		const startHeight = calcTableLayout(startTable).height;

		for (const localDeltaY of [-4000, -120, -40, -1, 0, 1, 40, 120, 4000]) {
			const resized = withRows(
				startTable,
				calcTableRowBoundaryDrag(startTable, 0, localDeltaY, "pair"),
			);
			const height = calcTableLayout(resized).height;

			// Nothing shrinks the table: both rows are already at their text.
			expect(height).toBeGreaterThanOrEqual(startHeight);
			// And only a downward drag may take it past the height it had.
			if (localDeltaY <= 0) {
				expect(height).toBe(startHeight);
			}
		}
	});

	it("touches no row but the two the boundary sits between", () => {
		const startTable = tableOf([40, 60, 50, 70]);
		expect(calcTableRowBoundaryDrag(startTable, 1, 25, "pair")).toEqual([
			{ height: 40 },
			{ height: 85 },
			{ height: 25 },
			{ height: 70 },
		]);
	});

	it("never writes a negative bound, however far the drag went", () => {
		const startTable = tableOf([60, 60]);
		for (const localDeltaY of [-10_000, 10_000]) {
			const rows = calcTableRowBoundaryDrag(startTable, 0, localDeltaY, "pair");
			for (const row of rows ?? []) {
				expect(row.height).toBeGreaterThanOrEqual(0);
			}
		}
	});

	it("rewrites the rows rather than mutating the ones it was given", () => {
		const startTable = tableOf([60, 60]);
		calcTableRowBoundaryDrag(startTable, 0, 20, "pair");
		expect(startTable.rows).toEqual([{ height: 60 }, { height: 60 }]);
	});

	it("refuses a boundary the grid does not have", () => {
		const startTable = tableOf([60, 60, 60]);
		// The last row's bottom edge is the table's own, not a boundary.
		expect(calcTableRowBoundaryDrag(startTable, 2, 20, "pair")).toBeNull();
		expect(calcTableRowBoundaryDrag(startTable, -1, 20, "pair")).toBeNull();
		expect(calcTableRowBoundaryDrag(tableOf([60]), 0, 20, "pair")).toBeNull();
		expect(
			calcTableRowBoundaryDrag({ columns: [{ width: 120 }] }, 0, 20, "pair"),
		).toBeNull();
	});
});

describe('calcTableRowBoundaryDrag in "leading" mode', () => {
	it("resizes the row above alone and grows the table by the whole drag", () => {
		const startTable = tableOf([60, 60, 60]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 1, 30, "leading");
		const resizedTable = withRows(startTable, rows);

		expect(rows).toEqual([{ height: 60 }, { height: 90 }, { height: 60 }]);
		expect(drawnHeightsOf(resizedTable)).toEqual([60, 90, 60]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight + 30);
	});

	it("shrinks the table for a negative drag, the row below keeping its bound", () => {
		const startTable = tableOf([60, 60]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, -20, "leading");

		expect(rows).toEqual([{ height: 40 }, { height: 60 }]);
		expect(calcTableLayout(withRows(startTable, rows)).height).toBe(
			startHeight - 20,
		);
	});

	it("leaves the row below's stored bound alone even when that row is at its text", () => {
		// The second row stores no bound; growing the row above must not write one.
		const startTable = tableOf([60, undefined]);
		const rows = calcTableRowBoundaryDrag(startTable, 0, 30, "leading");
		expect(rows?.[1]).toBe(startTable.rows?.[1]);
	});

	it("moves the boundary from where it is drawn, not from the bound the row stored", () => {
		const startTable = tableOf([undefined, 60]);
		const rows = calcTableRowBoundaryDrag(startTable, 0, 10, "leading");
		expect(rows?.[0].height).toBe(cellHeightOf(1) + 10);
	});

	it("stops at the text of the row above, storing the bound that was asked for", () => {
		const startTable = tableOf([undefined, 60], [TWO_LINE_TEXT, ""]);
		const startHeight = calcTableLayout(startTable).height;
		const rows = calcTableRowBoundaryDrag(startTable, 0, -30, "leading");
		const resizedTable = withRows(startTable, rows);

		expect(rows).toEqual([{ height: cellHeightOf(2) - 30 }, { height: 60 }]);
		expect(drawnHeightsOf(resizedTable)).toEqual([cellHeightOf(2), 60]);
		expect(calcTableLayout(resizedTable).height).toBe(startHeight);
	});

	it("never writes a negative bound, however far the drag went", () => {
		const rows = calcTableRowBoundaryDrag(
			tableOf([60, 60]),
			0,
			-10_000,
			"leading",
		);
		expect(rows?.[0].height).toBeGreaterThanOrEqual(0);
	});

	it("refuses a boundary the grid does not have", () => {
		expect(
			calcTableRowBoundaryDrag(tableOf([60, 60]), 1, 20, "leading"),
		).toBeNull();
	});
});
