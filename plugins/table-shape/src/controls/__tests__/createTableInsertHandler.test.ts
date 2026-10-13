import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tableCellTextSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { createTableInsertHandler } from "../createTableInsertHandler";

// The insertion re-derives the box from the cells' text, and measuring with
// nothing offered throws (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a grid, each holding its own address so a renumbering shows. */
const addressedCells = (
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			const id = tableCellTextSlotId(row, column);
			cells[id] = { text: id };
		}
	}
	return cells;
};

/** A 2x3 table; its row indices are 0 and 1, its column indices 0 to 2. */
const table = {
	id: "t-1",
	type: "table",
	cx: 0,
	cy: 0,
	width: 300,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	strokeWidth: 1,
	columns: [{ width: 100 }, { width: 100 }, { width: 100 }],
	rows: [{ height: 50 }, { height: 50 }],
	text: addressedCells(2, 3),
} as unknown as TableState;

const context: SelectionControlContext<TableState> = {
	object: table,
	startObject: table,
};

const MODS = { shift: false, alt: false, ctrl: false, meta: false };

const clickOn = (subAction: string | undefined): SelectionControlEvent => ({
	type: "click",
	last: { x: 0, y: 0 },
	mods: MODS,
	subAction,
});

const handleRowInsert = createTableInsertHandler("row");
const handleColumnInsert = createTableInsertHandler("column");

describe("createTableInsertHandler", () => {
	it("inserts a row at the boundary the badge stands on", () => {
		const result = handleRowInsert(context, clickOn("1"));

		expect(result?.object?.rows).toHaveLength(3);
		// The row that was second is now third, its cells renumbered with it.
		expect(result?.object?.text?.[tableCellTextSlotId(2, 0)]?.text).toBe(
			"r1c0",
		);
		expect(result?.object?.text?.[tableCellTextSlotId(1, 0)]?.text).toBe("");
	});

	it("inserts a column at the boundary the badge stands on", () => {
		const result = handleColumnInsert(context, clickOn("0"));

		expect(result?.object?.columns).toHaveLength(4);
		expect(result?.object?.text?.[tableCellTextSlotId(0, 1)]?.text).toBe(
			"r0c0",
		);
	});

	it("takes the outer edges, which is where a first or last track is added", () => {
		expect(handleRowInsert(context, clickOn("0"))?.object?.rows).toHaveLength(
			3,
		);
		expect(handleRowInsert(context, clickOn("2"))?.object?.rows).toHaveLength(
			3,
		);
		expect(
			handleColumnInsert(context, clickOn("3"))?.object?.columns,
		).toHaveLength(4);
	});

	it("leaves the inserted track selected, which no renumbering can stale", () => {
		expect(handleRowInsert(context, clickOn("1"))?.selection).toEqual({
			kind: "row",
			ranges: [{ anchorId: "1", focusId: "1" }],
		});
		expect(handleColumnInsert(context, clickOn("2"))?.selection).toEqual({
			kind: "column",
			ranges: [{ anchorId: "2", focusId: "2" }],
		});
	});

	it("drops a position the grid does not offer", () => {
		// One past the last edge: the badges number 0 to the track count.
		expect(handleRowInsert(context, clickOn("3"))).toBeNull();
		expect(handleColumnInsert(context, clickOn("4"))).toBeNull();
		expect(handleRowInsert(context, clickOn("-1"))).toBeNull();
		expect(handleRowInsert(context, clickOn("1.5"))).toBeNull();
		expect(handleRowInsert(context, clickOn(undefined))).toBeNull();
	});

	it("takes a doubleClick as one more press, the second of a rapid pair", () => {
		expect(
			handleRowInsert(context, {
				type: "doubleClick",
				last: { x: 0, y: 0 },
				mods: MODS,
				subAction: "1",
			}),
		).toEqual(handleRowInsert(context, clickOn("1")));
	});

	it("answers nothing to a drag", () => {
		expect(
			handleRowInsert(context, {
				type: "dragEnd",
				start: { x: 0, y: 0 },
				last: { x: 0, y: 10 },
				delta: { x: 0, y: 10 },
				mods: MODS,
				subAction: "1",
			}),
		).toBeNull();
	});
});
