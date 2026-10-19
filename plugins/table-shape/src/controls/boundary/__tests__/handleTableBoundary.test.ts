import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { calcFrameKeyPoint } from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { TABLE_MIN_COLUMN_WIDTH } from "../../../schema/TableDoc";
import { reconcileTableBoxWithGrid } from "../../../state/reconcileTableBoxWithGrid";
import type { TableState } from "../../../state/TableState";
import { handleTableColumnBoundary } from "../handleTableColumnBoundary";
import { handleTableRowBoundary } from "../handleTableRowBoundary";

// The row handler resolves the rows' text floors, and measuring with nothing
// offered throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/**
 * A 3x2 table of 100px columns and 50px rows centered at (500, 400) — so its
 * column boundaries are 1 and 2 apart, and its single row boundary is 0.
 */
const makeTable = (overrides: Partial<TableState> = {}): TableState =>
	({
		id: "t-1",
		type: "table",
		cx: 500,
		cy: 400,
		width: 300,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
		strokeWidth: 1,
		columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
		rows: [{ height: 50 }, { height: 50 }],
		text: {
			r0c0: { text: "" },
			r0c1: { text: "" },
			r0c2: { text: "" },
			r1c0: { text: "" },
			r1c1: { text: "" },
			r1c2: { text: "" },
		},
		...overrides,
	}) as unknown as TableState;

const makeContext = (
	table: TableState,
): SelectionControlContext<TableState> => ({
	object: table,
	startObject: table,
	selectedPart: null,
});

/**
 * A drag of `worldDelta` from the table's center, carrying `subAction` as the
 * boundary; `shift` is what puts the handlers in "pair" mode.
 */
const makeEvent = (
	subAction: string | undefined,
	worldDelta: Point,
	shift = false,
): SelectionControlEvent => ({
	type: "drag",
	start: { x: 500, y: 400 },
	last: { x: 500 + worldDelta.x, y: 400 + worldDelta.y },
	delta: worldDelta,
	mods: { shift, alt: false, ctrl: false, meta: false },
	subAction,
});

/**
 * Where the corner the table is drawn from sits, to 3 decimals: the resizer keeps
 * it at the coordinate precision (4), not to the float.
 */
const drawnCornerOf = (table: TableState | null): Point => {
	expect(table).not.toBeNull();
	const corner = calcFrameKeyPoint(table as TableState, "topLeft");
	return {
		x: Math.round(corner.x * 1e3) / 1e3,
		y: Math.round(corner.y * 1e3) / 1e3,
	};
};

/** The handler's result as the reducer leaves it, the box re-derived from the grid. */
const reconciledOf = (table: TableState | null): TableState => {
	expect(table).not.toBeNull();
	return reconcileTableBoxWithGrid(table as TableState, {});
};

/** The object a handler put in its result, or null when it reported no change. */
const objectOf = (
	result: SelectionControlResult<TableState> | null,
): TableState | null => result?.object ?? null;

const widthsOf = (table: TableState | null): number[] =>
	(table?.columns ?? []).map((column) => column.width);

const heightsOf = (table: TableState | null): (number | undefined)[] =>
	(table?.rows ?? []).map((row) => row.height);

describe("handleTableColumnBoundary", () => {
	it("resizes the column left of the boundary alone and leaves the box to the resizer", () => {
		const startTable = makeTable();
		const resized = objectOf(
			handleTableColumnBoundary(
				makeContext(startTable),
				makeEvent("1", { x: 40, y: 0 }),
			),
		);

		expect(widthsOf(resized)).toEqual([100, 140, 100]);
		expect(resized?.width).toBe(startTable.width);
		expect(resized?.cx).toBe(startTable.cx);
		expect(resized?.text).toBe(startTable.text);
		expect(resized?.rows).toBe(startTable.rows);
	});

	it("widens the table from its drawn corner once the resizer derives the box from the columns", () => {
		const startTable = makeTable();
		const reconciled = reconciledOf(
			objectOf(
				handleTableColumnBoundary(
					makeContext(startTable),
					makeEvent("0", { x: -30, y: 0 }),
				),
			),
		);

		expect(widthsOf(reconciled)).toEqual([70, 100, 100]);
		expect(reconciled.width).toBe(270);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("keeps the drawn corner of a rotated, mirrored table", () => {
		const startTable = makeTable({ rotation: 30, scaleX: -1 });
		const reconciled = reconciledOf(
			objectOf(
				handleTableColumnBoundary(
					makeContext(startTable),
					makeEvent("0", { x: 50, y: -20 }),
				),
			),
		);

		expect(reconciled.width).not.toBe(startTable.width);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("stops the column at the minimum", () => {
		const resized = objectOf(
			handleTableColumnBoundary(
				makeContext(makeTable()),
				makeEvent("0", { x: -1000, y: 0 }),
			),
		);
		expect(widthsOf(resized)).toEqual([TABLE_MIN_COLUMN_WIDTH, 100, 100]);
		expect(reconciledOf(resized).width).toBe(TABLE_MIN_COLUMN_WIDTH + 200);
	});

	it("trades between the pair with Shift held and leaves the table's width alone", () => {
		const startTable = makeTable();
		const resized = objectOf(
			handleTableColumnBoundary(
				makeContext(startTable),
				makeEvent("1", { x: 40, y: 0 }, true),
			),
		);

		expect(widthsOf(resized)).toEqual([100, 140, 60]);
		expect(resized?.width).toBe(startTable.width);
		expect(resized?.cx).toBe(startTable.cx);
		// Untouched fields come through by reference; the box is the resizer's to
		// re-derive on the same tick.
		expect(resized?.text).toBe(startTable.text);
		expect(resized?.rows).toBe(startTable.rows);
	});

	it("rebuilds from gesture start when Shift changes mid-drag", () => {
		const context = makeContext(makeTable());
		handleTableColumnBoundary(context, makeEvent("1", { x: 40, y: 0 }, true));
		const resized = objectOf(
			handleTableColumnBoundary(context, makeEvent("1", { x: 40, y: 0 })),
		);
		expect(widthsOf(resized)).toEqual([100, 140, 100]);
	});

	it("reads the drag in the table's own axes, so a rotated table resizes along its columns", () => {
		// Rotated a quarter turn clockwise: the table's local +x points down the
		// screen, so a downward drag is what widens a column.
		const resized = objectOf(
			handleTableColumnBoundary(
				makeContext(makeTable({ rotation: 90 })),
				makeEvent("0", { x: 0, y: 40 }),
			),
		);
		expect(widthsOf(resized)).toEqual([140, 100, 100]);
	});

	it("follows the cursor on a mirrored table, where the local axis runs the other way", () => {
		const resized = objectOf(
			handleTableColumnBoundary(
				makeContext(makeTable({ scaleX: -1 })),
				makeEvent("0", { x: 40, y: 0 }),
			),
		);
		// The drag went right, which on a mirrored table is the negative local
		// direction — and the column drawn to the right of that boundary is
		// columns[0], which is what has to shrink.
		expect(widthsOf(resized)).toEqual([60, 100, 100]);
	});

	it("declines a part that names no boundary", () => {
		const context = makeContext(makeTable());
		expect(
			handleTableColumnBoundary(context, makeEvent(undefined, { x: 40, y: 0 })),
		).toBeNull();
		expect(
			handleTableColumnBoundary(context, makeEvent("1.5", { x: 40, y: 0 })),
		).toBeNull();
		// The table's own right edge: three columns leave two inner boundaries.
		expect(
			handleTableColumnBoundary(context, makeEvent("2", { x: 40, y: 0 })),
		).toBeNull();
	});
});

describe("handleTableRowBoundary", () => {
	it("resizes the row above alone, and the resizer grows the table from its drawn corner", () => {
		const startTable = makeTable();
		const resized = objectOf(
			handleTableRowBoundary(
				makeContext(startTable),
				makeEvent("0", { x: 0, y: 30 }),
			),
		);

		expect(heightsOf(resized)).toEqual([80, 50]);
		expect(resized?.columns).toBe(startTable.columns);
		const reconciled = reconciledOf(resized);
		expect(reconciled.height).toBe(130);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("keeps the drawn corner of a rotated, mirrored table as it shrinks", () => {
		const startTable = makeTable({ rotation: 135, scaleY: -1 });
		const reconciled = reconciledOf(
			objectOf(
				handleTableRowBoundary(
					makeContext(startTable),
					makeEvent("0", { x: 10, y: 10 }),
				),
			),
		);

		expect(reconciled.height).not.toBe(startTable.height);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("trades between the pair with Shift held", () => {
		const startTable = makeTable();
		const resized = objectOf(
			handleTableRowBoundary(
				makeContext(startTable),
				makeEvent("0", { x: 0, y: 15 }, true),
			),
		);

		expect(heightsOf(resized)).toEqual([65, 35]);
		expect(reconciledOf(resized).height).toBe(startTable.height);
	});

	it("reads the drag in the table's own axes", () => {
		// Rotated a quarter turn clockwise: local +y points left on screen.
		const resized = objectOf(
			handleTableRowBoundary(
				makeContext(makeTable({ rotation: 90 })),
				makeEvent("0", { x: -30, y: 0 }),
			),
		);
		expect(heightsOf(resized)).toEqual([80, 50]);
	});

	it("declines a part that names no boundary", () => {
		const context = makeContext(makeTable());
		expect(
			handleTableRowBoundary(context, makeEvent(undefined, { x: 0, y: 30 })),
		).toBeNull();
		expect(
			handleTableRowBoundary(context, makeEvent("1", { x: 0, y: 30 })),
		).toBeNull();
	});
});
