import type { ResizedAxes } from "@jiscribe/canvas";
import {
	advanceTextMeasurementGeneration,
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import {
	calcTableLayout,
	calcTableMinHeight,
} from "../../layout/calcTableLayout";
import { readCachedTableLayout } from "../../layout/readCachedTableLayout";
import {
	TABLE_MIN_COLUMN_WIDTH,
	tableCellTextSlotId,
} from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import { reconcileTableBoxWithGrid } from "../reconcileTableBoxWithGrid";
import type { TableState } from "../TableState";

// The row heights are resolved from the cells' text, and measuring with nothing
// offered throws (see calcTableLayout.test.ts). The measurer is counted to see
// how many cells a run measures: one measurer per plain cell measured.
let measurerCount = 0;
const estimate = createEstimateTextMeasurement();
offerTextMeasurement({
	...estimate,
	createMeasurer: (font) => {
		measurerCount++;
		return estimate.createMeasurer(font);
	},
});

/** The cells of a 2x2 grid written out as `[row][column]` text. */
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
	const layout = calcTableLayout(grid);
	return {
		...grid,
		width: layout.width,
		height: layout.height,
		minWidth: TABLE_MIN_COLUMN_WIDTH * 2,
		minHeight: calcTableMinHeight(layout),
		cx: 380 + layout.width / 2,
		cy: 375 + layout.height / 2,
		...overrides,
	} as unknown as TableState;
};

/** No resize drag under way: what every transition but a transform-handle drag hands over. */
const STILL = {};

/** A right handle's drag, holding the left edge. */
const WIDTH_DRAG: { resizedAxes: ResizedAxes } = {
	resizedAxes: { width: "start" },
};

/** A bottom handle's drag, holding the top edge. */
const HEIGHT_DRAG: { resizedAxes: ResizedAxes } = {
	resizedAxes: { height: "start" },
};

/** A top-left handle's drag, holding the bottom-right corner. */
const TOP_LEFT_DRAG: { resizedAxes: ResizedAxes } = {
	resizedAxes: { width: "end", height: "end" },
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

/** Top edge of a table drawn with no rotation and no flip. */
const topEdgeOf = (table: TableState): number => table.cy - table.height / 2;

/** The box a bottom-edge drag leaves behind: a new height, with the top edge held. */
const draggedBottomEdgeTo = (table: TableState, height: number): TableState =>
	makeTable({
		...table,
		height,
		cy: topEdgeOf(table) + height / 2,
	});

const widthsOf = (table: TableState): number[] =>
	table.columns.map((column) => column.width);

const heightsOf = (table: TableState): (number | undefined)[] =>
	table.rows.map((row) => row.height);

/** The heights the rows are drawn at, which a stored bound may sit under. */
const drawnHeightsOf = (table: TableState): number[] => {
	const { rowEdgeYs } = readCachedTableLayout(table);
	return table.rows.map((_, index) => rowEdgeYs[index + 1] - rowEdgeYs[index]);
};

describe("reconcileTableBoxWithGrid", () => {
	it("hands back the same state when the box already answers for the grid", () => {
		const table = makeTable();

		expect(reconcileTableBoxWithGrid(table, STILL)).toBe(table);
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
		const resized = reconcileTableBoxWithGrid(table, STILL);

		expect(resized.width).toBe(240);
		expect(resized.height).toBeGreaterThan(table.height);
		expect(resized.columns).toBe(table.columns);
		expect(resized.cy - resized.height / 2).toBe(375);
	});

	it("shrinks the table back when the text that held a row is deleted", () => {
		const wrapped = reconcileTableBoxWithGrid(
			makeTable({
				text: cellsOf([
					["aaaaaa aaaaaa aaaaaa", ""],
					["", ""],
				]),
			}),
			STILL,
		);
		const cleared = reconcileTableBoxWithGrid(
			{
				...wrapped,
				text: cellsOf([
					["", ""],
					["", ""],
				]),
			},
			STILL,
		);

		expect(cleared.height).toBeLessThan(wrapped.height);
		expect(cleared.height).toBe(makeTable().height);
		expect(topEdgeOf(cleared)).toBe(375);
	});

	it("answers a box written with no resize drag under way with the grid's own", () => {
		const table = makeTable({ columns: [{ width: 80 }, { width: 160 }] });
		const reconciled = reconcileTableBoxWithGrid(
			draggedBottomEdgeTo(draggedRightEdgeTo(table, 360), 400),
			STILL,
		);

		expect(reconciled.columns).toBe(table.columns);
		expect(reconciled.rows).toBe(table.rows);
		expect(reconciled.width).toBe(table.width);
		expect(reconciled.height).toBe(table.height);
	});

	it("spreads a width a side-handle drag writes over the columns in the proportions they hold", () => {
		const table = makeTable({ columns: [{ width: 80 }, { width: 160 }] });
		const resized = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(table, 360),
			WIDTH_DRAG,
		);

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
		const wrapped = reconcileTableBoxWithGrid(table, STILL);
		const widened = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(wrapped, 480),
			WIDTH_DRAG,
		);

		expect(widened.width).toBe(480);
		// The text that needed two lines in a 120px column fits one in a 240px one.
		expect(widened.height).toBeLessThan(wrapped.height);
	});

	it("stops at the narrowest grid it can build rather than collapsing", () => {
		const table = makeTable();
		const clamped = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(table, 30),
			WIDTH_DRAG,
		);

		expect(widthsOf(clamped)).toEqual([
			TABLE_MIN_COLUMN_WIDTH,
			TABLE_MIN_COLUMN_WIDTH,
		]);
		expect(clamped.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);

		// Dragged further, the derived box goes on winning and nothing narrows.
		const further = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(clamped, 5),
			WIDTH_DRAG,
		);
		expect(further.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);
		expect(widthsOf(further)).toEqual(widthsOf(clamped));
	});

	it("reads only the width off a width drag, a stale height leaving the rows alone", () => {
		const table = makeTable({ rows: [{ height: 40 }, { height: 60 }] });
		const reconciled = reconcileTableBoxWithGrid(table, STILL);
		const dragged = makeTable({
			...draggedRightEdgeTo(reconciled, 360),
			height: reconciled.height + 50,
		});
		const resized = reconcileTableBoxWithGrid(dragged, WIDTH_DRAG);

		expect(resized.width).toBe(360);
		expect(resized.rows).toBe(table.rows);
		expect(resized.height).toBe(reconciled.height);
	});

	it("spreads a height a bottom-edge drag writes over the rows as they are drawn", () => {
		const table = reconcileTableBoxWithGrid(
			makeTable({ rows: [{ height: 40 }, { height: 80 }] }),
			STILL,
		);
		expect(drawnHeightsOf(table)).toEqual([40, 80]);

		const resized = reconcileTableBoxWithGrid(
			draggedBottomEdgeTo(table, 240),
			HEIGHT_DRAG,
		);

		expect(heightsOf(resized)).toEqual([80, 160]);
		expect(resized.height).toBe(240);
		expect(resized.columns).toBe(table.columns);
		expect(topEdgeOf(resized)).toBe(375);
		expect(leftEdgeOf(resized)).toBe(380);
		// The frame after reads the rows' sum back as the height it wrote.
		expect(reconcileTableBoxWithGrid(resized, HEIGHT_DRAG)).toBe(resized);
	});

	it("takes the proportions from the drawn heights, a row its text holds above its bound included", () => {
		const table = reconcileTableBoxWithGrid(
			makeTable({
				rows: [{}, { height: 100 }],
				text: cellsOf([
					["aaaaaa aaaaaa aaaaaa", ""],
					["", ""],
				]),
			}),
			STILL,
		);
		const [startTop, startBottom] = drawnHeightsOf(table);
		expect(startTop).toBeGreaterThan(0);

		const resized = reconcileTableBoxWithGrid(
			draggedBottomEdgeTo(table, table.height * 2),
			HEIGHT_DRAG,
		);
		const [resizedTop, resizedBottom] = drawnHeightsOf(resized);

		expect(resizedTop / resizedBottom).toBeCloseTo(startTop / startBottom, 3);
		expect(resized.height).toBeCloseTo(table.height * 2, 3);
	});

	it("stops at the rows' text, dropping the bounds of the rows it holds there", () => {
		const text = cellsOf([
			["aaaaaa aaaaaa aaaaaa", ""],
			["", ""],
		]);
		const table = reconcileTableBoxWithGrid(
			makeTable({ rows: [{ height: 40 }, { height: 40 }], text }),
			STILL,
		);
		const floors = readCachedTableLayout(table).rowFloors;

		const clamped = reconcileTableBoxWithGrid(
			draggedBottomEdgeTo(table, 10),
			HEIGHT_DRAG,
		);

		// The derived box wins, so the table stops at its floors instead of shrinking.
		expect(clamped.height).toBeCloseTo(floors[0] + floors[1], 6);
		expect(clamped.height).toBe(clamped.minHeight);
		expect(drawnHeightsOf(clamped)).toEqual(floors);
		// Every row landed on its floor and stores no bound, so the table follows its
		// text entirely: deleting it brings the table down to an empty one.
		expect(heightsOf(clamped)).toEqual([undefined, undefined]);
		const cleared = reconcileTableBoxWithGrid(
			{
				...clamped,
				text: cellsOf([
					["", ""],
					["", ""],
				]),
			},
			STILL,
		);
		expect(cleared.height).toBeLessThan(clamped.height);
		expect(cleared.height).toBe(makeTable().height);
	});

	it("holds the edges a drag keeps when the grid stops it, so the table does not slide with the cursor", () => {
		const text = cellsOf([
			["aaaaaa aaaaaa aaaaaa", ""],
			["", ""],
		]);
		const table = reconcileTableBoxWithGrid(makeTable({ text }), STILL);
		const right = table.cx + table.width / 2;
		const bottom = table.cy + table.height / 2;

		// The top-left handle dragged far in: the columns stop at their minimum and
		// the narrowed cell wraps taller, both past what the drag asked for.
		const draggedWidth = 10;
		const draggedHeight = 10;
		const clamped = reconcileTableBoxWithGrid(
			makeTable({
				...table,
				width: draggedWidth,
				height: draggedHeight,
				cx: right - draggedWidth / 2,
				cy: bottom - draggedHeight / 2,
			}),
			TOP_LEFT_DRAG,
		);

		expect(clamped.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);
		expect(clamped.height).toBeGreaterThan(table.height);
		expect(clamped.cx + clamped.width / 2).toBeCloseTo(right, 6);
		expect(clamped.cy + clamped.height / 2).toBeCloseTo(bottom, 6);
	});

	it("holds the edge in the table's own frame when it is rotated", () => {
		const table = reconcileTableBoxWithGrid(makeTable({ rotation: 90 }), STILL);
		// At 90° the table's local bottom edge is on the screen's left.
		const heldBottomX = table.cx - table.height / 2;

		const draggedHeight = 2;
		const clamped = reconcileTableBoxWithGrid(
			makeTable({
				...table,
				height: draggedHeight,
				cx: heldBottomX + draggedHeight / 2,
			}),
			{ resizedAxes: { height: "end" } },
		);

		expect(clamped.height).toBe(clamped.minHeight);
		expect(clamped.cx - clamped.height / 2).toBeCloseTo(heldBottomX, 6);
	});

	it("holds the edge in the table's own frame when it is flipped", () => {
		const table = reconcileTableBoxWithGrid(makeTable({ scaleX: -1 }), STILL);
		// Flipped on x, the table's local right (end) edge is on the screen's left.
		const heldRightX = table.cx - table.width / 2;

		const draggedWidth = 2;
		const clamped = reconcileTableBoxWithGrid(
			makeTable({
				...table,
				width: draggedWidth,
				cx: heldRightX + draggedWidth / 2,
			}),
			{ resizedAxes: { width: "end" } },
		);

		expect(clamped.width).toBe(TABLE_MIN_COLUMN_WIDTH * 2);
		expect(clamped.cx - clamped.width / 2).toBeCloseTo(heldRightX, 6);
	});

	it("shrinks no further than the rows' text about the middle a Shift side-handle drag holds", () => {
		const table = reconcileTableBoxWithGrid(makeTable(), STILL);

		// The right handle with Shift held: the height is written about the middle.
		const draggedHeight = 2;
		const clamped = reconcileTableBoxWithGrid(
			makeTable({ ...table, height: draggedHeight }),
			{ resizedAxes: { width: "start", height: "center" } },
		);

		expect(clamped.height).toBe(clamped.minHeight);
		expect(clamped.height).toBeGreaterThan(draggedHeight);
		expect(clamped.cy).toBeCloseTo(table.cy, 6);
		expect(leftEdgeOf(clamped)).toBeCloseTo(leftEdgeOf(table), 6);
	});

	it("grows about the middle a Shift side-handle drag holds when narrower columns wrap the text taller", () => {
		const table = reconcileTableBoxWithGrid(
			makeTable({
				text: cellsOf([
					["aaaaaa aaaaaa", ""],
					["", ""],
				]),
			}),
			STILL,
		);
		const top = topEdgeOf(table);
		const bottom = table.cy + table.height / 2;

		// The columns stop at their minimum, where the cell wraps onto more lines
		// than the height the drag wrote leaves room for.
		const narrowed = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(table, TABLE_MIN_COLUMN_WIDTH * 2),
			{ resizedAxes: { width: "start", height: "center" } },
		);

		expect(narrowed.height).toBeGreaterThan(table.height);
		expect(narrowed.cy).toBeCloseTo(table.cy, 6);
		expect(topEdgeOf(narrowed)).toBeLessThan(top);
		expect(narrowed.cy + narrowed.height / 2).toBeGreaterThan(bottom);
	});

	it("keeps the lowest grid the text allows on the state as minHeight", () => {
		const table = makeTable({
			text: cellsOf([
				["aaaaaa aaaaaa aaaaaa", ""],
				["", ""],
			]),
		});
		const reconciled = reconcileTableBoxWithGrid(table, STILL);

		const { rowFloors } = readCachedTableLayout(table);
		expect(reconciled.minHeight).toBe(rowFloors[0] + rowFloors[1]);
		expect(reconcileTableBoxWithGrid(reconciled, STILL)).toBe(reconciled);
		// A stale floor alone is enough to hand back a fresh state.
		const stale = { ...reconciled, minHeight: 0 };
		expect(reconcileTableBoxWithGrid(stale, STILL)).not.toBe(stale);
		expect(reconcileTableBoxWithGrid(stale, STILL).minHeight).toBe(
			reconciled.minHeight,
		);
	});

	it("keeps the narrowest grid on the state as minWidth, following the column count", () => {
		const table = makeTable({
			columns: [{ width: 120 }, { width: 120 }, { width: 120 }],
			text: cellsOf([
				["", "", ""],
				["", "", ""],
			]),
		});
		const reconciled = reconcileTableBoxWithGrid(table, STILL);

		// The transform frame stops a dragged edge here itself, holding the opposite
		// edge; the box derived above would hold the drawn left edge instead.
		expect(reconciled.minWidth).toBe(TABLE_MIN_COLUMN_WIDTH * 3);
		expect(reconcileTableBoxWithGrid(reconciled, STILL)).toBe(reconciled);
	});

	it("settles on a box the next frame hands straight back", () => {
		const table = makeTable({ columns: [{ width: 70 }, { width: 170 }] });
		const resized = reconcileTableBoxWithGrid(
			draggedRightEdgeTo(table, 301),
			WIDTH_DRAG,
		);

		// The columns sum to exactly the width that was stored, so the next frame
		// of the drag finds nothing to distribute and re-measures nothing.
		expect(reconcileTableBoxWithGrid(resized, WIDTH_DRAG)).toBe(resized);
	});
});

describe("reconcileTableBoxWithGrid and the layout cache", () => {
	it("lays a dragged width out once, under the state it hands back", () => {
		// Text that wraps at every width here, so no cell is spared as one its
		// column fits unbroken.
		const wrappingText = "aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa aaaaaa";
		const table = reconcileTableBoxWithGrid(
			makeTable({
				columns: [{ width: 80 }, { width: 160 }],
				text: cellsOf([
					[wrappingText, wrappingText],
					[wrappingText, wrappingText],
				]),
			}),
			STILL,
		);
		const dragged = draggedRightEdgeTo(table, 360);
		measurerCount = 0;

		const resized = reconcileTableBoxWithGrid(dragged, WIDTH_DRAG);
		const laidOut = readCachedTableLayout(resized);

		// Both columns are redistributed, so all four cells, once: the decision costs
		// no pass of its own, and the renderers' read of the returned state hits.
		expect(widthsOf(resized)).toEqual([120, 240]);
		expect(measurerCount).toBe(4);
		expect(laidOut.width).toBe(360);
	});

	it("measures no cell a dragged width leaves fitting its column unbroken", () => {
		const table = reconcileTableBoxWithGrid(
			makeTable({ columns: [{ width: 80 }, { width: 160 }] }),
			STILL,
		);
		const dragged = draggedRightEdgeTo(table, 360);
		measurerCount = 0;

		const resized = reconcileTableBoxWithGrid(dragged, WIDTH_DRAG);

		expect(widthsOf(resized)).toEqual([120, 240]);
		expect(measurerCount).toBe(0);
	});

	it("lays a grown grid out once, under the state it hands back", () => {
		const table = makeTable({
			text: cellsOf([
				["aaaaaa aaaaaa", ""],
				["", ""],
			]),
		});
		measurerCount = 0;

		const resized = reconcileTableBoxWithGrid(table, STILL);
		readCachedTableLayout(resized);

		expect(measurerCount).toBe(4);
	});

	it("measures no cell when only a row's stored height moved, as a boundary drag does", () => {
		const table = reconcileTableBoxWithGrid(makeTable(), STILL);
		measurerCount = 0;

		const resized = reconcileTableBoxWithGrid(
			{ ...table, rows: [{ height: 80 }, {}] },
			STILL,
		);

		expect(resized.height).toBeGreaterThan(table.height);
		expect(measurerCount).toBe(0);
	});

	it("measures the same state afresh once the measurement generation moves on, which is how a font arriving reaches it", () => {
		const table = reconcileTableBoxWithGrid(makeTable(), STILL);
		const stale = readCachedTableLayout(table);
		measurerCount = 0;

		advanceTextMeasurementGeneration();
		expect(reconcileTableBoxWithGrid(table, STILL)).toBe(table);

		const fresh = readCachedTableLayout(table);
		expect(fresh).not.toBe(stale);
		expect(fresh).toEqual(stale);
		expect(measurerCount).toBe(4);
	});

	it("measures nothing for a state whose grid is laid out already", () => {
		const table = reconcileTableBoxWithGrid(makeTable(), STILL);
		measurerCount = 0;

		const recolored = { ...table, strokeColor: "red" };

		expect(reconcileTableBoxWithGrid(recolored, STILL)).toBe(recolored);
		expect(measurerCount).toBe(0);
	});
});
