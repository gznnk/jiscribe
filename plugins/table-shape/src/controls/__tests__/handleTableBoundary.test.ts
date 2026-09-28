import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import type { Point } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import type { TableState } from "../../state/TableState";
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
});

/** A drag of `worldDelta` from the table's center, carrying `subPart` as the boundary. */
const makeEvent = (
	subPart: string | undefined,
	worldDelta: Point,
): SelectionControlEvent => ({
	type: "drag",
	start: { x: 500, y: 400 },
	last: { x: 500 + worldDelta.x, y: 400 + worldDelta.y },
	delta: worldDelta,
	mods: { shift: false, alt: false, ctrl: false, meta: false },
	subPart,
});

const widthsOf = (table: TableState | null): number[] =>
	(table?.columns ?? []).map((column) => column.width);

const heightsOf = (table: TableState | null): (number | undefined)[] =>
	(table?.rows ?? []).map((row) => row.height);

describe("handleTableColumnBoundary", () => {
	it("resizes the pair the data-part names and leaves the table's width alone", () => {
		const startTable = makeTable();
		const resized = handleTableColumnBoundary(
			makeContext(startTable),
			makeEvent("1", { x: 40, y: 0 }),
		);

		expect(widthsOf(resized)).toEqual([100, 140, 60]);
		expect(resized?.width).toBe(startTable.width);
		expect(resized?.cx).toBe(startTable.cx);
		// Untouched fields come through by reference; the box is the resizer's to
		// re-derive on the same tick.
		expect(resized?.text).toBe(startTable.text);
		expect(resized?.rows).toBe(startTable.rows);
	});

	it("reads the drag in the table's own axes, so a rotated table resizes along its columns", () => {
		// Rotated a quarter turn clockwise: the table's local +x points down the
		// screen, so a downward drag is what widens a column.
		const resized = handleTableColumnBoundary(
			makeContext(makeTable({ rotation: 90 })),
			makeEvent("0", { x: 0, y: 40 }),
		);
		expect(widthsOf(resized)).toEqual([140, 60, 100]);
	});

	it("follows the cursor on a mirrored table, where the local axis runs the other way", () => {
		const resized = handleTableColumnBoundary(
			makeContext(makeTable({ scaleX: -1 })),
			makeEvent("0", { x: 40, y: 0 }),
		);
		// The drag went right, which on a mirrored table is the negative local
		// direction — and the column drawn to the right of that boundary is
		// columns[0], which is what has to shrink.
		expect(widthsOf(resized)).toEqual([60, 140, 100]);
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
	it("resizes the pair the data-part names", () => {
		const startTable = makeTable();
		const resized = handleTableRowBoundary(
			makeContext(startTable),
			makeEvent("0", { x: 0, y: 30 }),
		);

		expect(heightsOf(resized)).toEqual([80, 20]);
		expect(resized?.columns).toBe(startTable.columns);
		expect(resized?.height).toBe(startTable.height);
	});

	it("reads the drag in the table's own axes", () => {
		// Rotated a quarter turn clockwise: local +y points left on screen.
		const resized = handleTableRowBoundary(
			makeContext(makeTable({ rotation: 90 })),
			makeEvent("0", { x: -30, y: 0 }),
		);
		expect(heightsOf(resized)).toEqual([80, 20]);
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
