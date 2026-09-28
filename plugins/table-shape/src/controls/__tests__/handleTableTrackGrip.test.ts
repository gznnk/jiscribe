import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { createTableTrackGripHandler } from "../handleTableTrackGrip";

/** The cells of a grid, all empty. */
const emptyCells = (
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			cells[tableCellSlotId(row, column)] = { text: "" };
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
	text: emptyCells(2, 3),
} as unknown as TableState;

const context: SelectionControlContext<TableState> = {
	object: table,
	startObject: table,
};

const MODS = { shift: false, alt: false, ctrl: false, meta: false };

const clickOn = (subPart: string | undefined): SelectionControlEvent => ({
	type: "click",
	last: { x: 0, y: 0 },
	mods: MODS,
	subPart,
});

const handleRowGrip = createTableTrackGripHandler("row");
const handleColumnGrip = createTableTrackGripHandler("column");

describe("createTableTrackGripHandler", () => {
	it("selects the whole track the grip stands for, as its own kind", () => {
		expect(handleRowGrip(context, clickOn("1"))).toEqual({
			selection: { kind: "row", partIds: ["1"] },
		});
		expect(handleColumnGrip(context, clickOn("2"))).toEqual({
			selection: { kind: "column", partIds: ["2"] },
		});
	});

	it("writes no object, so a click on a grip is never a document change", () => {
		expect(handleRowGrip(context, clickOn("0"))?.object).toBeUndefined();
	});

	it("drops a part naming a track the grid does not have", () => {
		expect(handleRowGrip(context, clickOn("2"))).toBeNull();
		expect(handleColumnGrip(context, clickOn("3"))).toBeNull();
		expect(handleRowGrip(context, clickOn("x"))).toBeNull();
		expect(handleRowGrip(context, clickOn(undefined))).toBeNull();
	});

	it("ignores every gesture but the click", () => {
		const drag: SelectionControlEvent = {
			type: "drag",
			start: { x: 0, y: 0 },
			last: { x: 10, y: 0 },
			delta: { x: 10, y: 0 },
			mods: MODS,
			subPart: "0",
		};

		expect(handleRowGrip(context, drag)).toBeNull();
		expect(
			handleRowGrip(context, { ...clickOn("0"), type: "doubleClick" }),
		).toBeNull();
	});
});
