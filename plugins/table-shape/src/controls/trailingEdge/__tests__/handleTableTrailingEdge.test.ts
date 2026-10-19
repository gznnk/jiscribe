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

import { readCachedTableLayout } from "../../../layout/readCachedTableLayout";
import { TABLE_MIN_COLUMN_WIDTH } from "../../../schema/TableDoc";
import { reconcileTableBoxWithGrid } from "../../../state/reconcileTableBoxWithGrid";
import type { TableState } from "../../../state/TableState";
import { handleTableTrailingEdge } from "../handleTableTrailingEdge";

// The row edge resolves the drawn heights, and measuring with nothing offered
// throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** Text that wraps onto several lines in a 100px column. */
const WRAPPING_TEXT = "aaaaaa aaaaaa aaaaaa aaaaaa";

/** A 3x2 table of 100px columns and 50px rows centered at (500, 400). */
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

/** A drag of `worldDelta` from the table's center on the edge `subAction` names. */
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

/** Where the corner the table is drawn from sits, to 3 decimals. */
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

const objectOf = (
	result: SelectionControlResult<TableState> | null,
): TableState | null => result?.object ?? null;

const widthsOf = (table: TableState | null): number[] =>
	(table?.columns ?? []).map((column) => column.width);

const heightsOf = (table: TableState | null): (number | undefined)[] =>
	(table?.rows ?? []).map((row) => row.height);

describe("handleTableTrailingEdge on the column edge", () => {
	it("resizes the last column alone, and the resizer widens the table from its drawn corner", () => {
		const startTable = makeTable();
		const reconciled = reconciledOf(
			objectOf(
				handleTableTrailingEdge(
					makeContext(startTable),
					makeEvent("column", { x: 40, y: 0 }),
				),
			),
		);

		expect(widthsOf(reconciled)).toEqual([100, 100, 140]);
		expect(reconciled.width).toBe(340);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
		expect(reconciled.text).toBe(startTable.text);
	});

	it("stops the last column at the minimum", () => {
		const resized = objectOf(
			handleTableTrailingEdge(
				makeContext(makeTable()),
				makeEvent("column", { x: -1000, y: 0 }),
			),
		);
		expect(widthsOf(resized)).toEqual([100, 100, TABLE_MIN_COLUMN_WIDTH]);
		expect(reconciledOf(resized).width).toBe(TABLE_MIN_COLUMN_WIDTH + 200);
	});

	it("keeps the drawn corner of a rotated, mirrored table", () => {
		const startTable = makeTable({ rotation: 30, scaleX: -1 });
		const reconciled = reconciledOf(
			objectOf(
				handleTableTrailingEdge(
					makeContext(startTable),
					makeEvent("column", { x: -50, y: 20 }),
				),
			),
		);

		expect(reconciled.width).not.toBe(startTable.width);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("follows the cursor on a mirrored table, whose last column is drawn on the left", () => {
		// The trailing edge of a table mirrored on x is on its left, so dragging
		// left is what widens the last column.
		const resized = objectOf(
			handleTableTrailingEdge(
				makeContext(makeTable({ scaleX: -1 })),
				makeEvent("column", { x: -40, y: 0 }),
			),
		);
		expect(widthsOf(resized)).toEqual([100, 100, 140]);
	});

	it("ignores Shift, an edge having no neighbour to trade with", () => {
		const context = makeContext(makeTable());
		expect(
			handleTableTrailingEdge(
				context,
				makeEvent("column", { x: 40, y: 0 }, true),
			),
		).toEqual(
			handleTableTrailingEdge(context, makeEvent("column", { x: 40, y: 0 })),
		);
	});
});

describe("handleTableTrailingEdge on the row edge", () => {
	it("resizes the last row alone, and the resizer grows the table from its drawn corner", () => {
		const startTable = makeTable();
		const resized = objectOf(
			handleTableTrailingEdge(
				makeContext(startTable),
				makeEvent("row", { x: 0, y: 30 }),
			),
		);

		expect(heightsOf(resized)).toEqual([50, 80]);
		expect(resized?.columns).toBe(startTable.columns);
		const reconciled = reconciledOf(resized);
		expect(reconciled.height).toBe(130);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("stops at the last row's text but stores the bound that was asked for", () => {
		const startTable = makeTable({
			text: { ...makeTable().text, r1c2: { text: WRAPPING_TEXT } },
		});
		const floor = readCachedTableLayout(startTable).rowFloors[1];
		// The wrapping text has to be what holds the row, or this proves nothing.
		expect(floor).toBeGreaterThan(50);
		const startHeight = reconciledOf(startTable).height;

		const resized = objectOf(
			handleTableTrailingEdge(
				makeContext(reconciledOf(startTable)),
				makeEvent("row", { x: 0, y: -40 }),
			),
		);

		// Asked: the row's drawn height (its text) less the 40px dragged.
		expect(heightsOf(resized)).toEqual([50, floor - 40]);
		// Drawn: the text still holds the row, so the table did not shrink.
		expect(reconciledOf(resized).height).toBe(startHeight);
	});

	it("keeps the drawn corner of a rotated, mirrored table as it shrinks", () => {
		const startTable = makeTable({ rotation: 135, scaleY: -1 });
		const reconciled = reconciledOf(
			objectOf(
				handleTableTrailingEdge(
					makeContext(startTable),
					makeEvent("row", { x: 10, y: 10 }),
				),
			),
		);

		expect(reconciled.height).not.toBe(startTable.height);
		expect(drawnCornerOf(reconciled)).toEqual(drawnCornerOf(startTable));
	});

	it("ignores Shift, an edge having no neighbour to trade with", () => {
		const context = makeContext(makeTable());
		expect(
			handleTableTrailingEdge(context, makeEvent("row", { x: 0, y: 30 }, true)),
		).toEqual(
			handleTableTrailingEdge(context, makeEvent("row", { x: 0, y: 30 })),
		);
	});
});

describe("handleTableTrailingEdge", () => {
	it("declines a part that names no edge", () => {
		const context = makeContext(makeTable());
		for (const subAction of [undefined, "0", "Column", "row:1"]) {
			expect(
				handleTableTrailingEdge(
					context,
					makeEvent(subAction, { x: 40, y: 40 }),
				),
			).toBeNull();
		}
	});
});
