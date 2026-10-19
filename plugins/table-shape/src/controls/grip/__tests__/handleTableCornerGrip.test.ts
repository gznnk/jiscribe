import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { tableCellTextSlotId } from "../../../schema/TableDoc";
import type { TableCell } from "../../../schema/TableDoc";
import type { TableState } from "../../../state/TableState";
import { handleTableCornerGrip } from "../handleTableCornerGrip";

/** The cells of a grid, all empty. */
const emptyCells = (
	rowCount: number,
	columnCount: number,
): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	for (let row = 0; row < rowCount; row++) {
		for (let column = 0; column < columnCount; column++) {
			cells[tableCellTextSlotId(row, column)] = { text: "" };
		}
	}
	return cells;
};

/** A 2x3 table; its cells run from r0c0 to r1c2. */
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

/** The table with `ranges` of `kind` standing on it. */
const pickedOn = (
	kind: string,
	ranges: readonly (readonly [string, string])[],
): SelectionControlContext<TableState> => ({
	object: table,
	startObject: table,
	selectedPart: {
		kind,
		ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
	},
});

const context: SelectionControlContext<TableState> = {
	object: table,
	startObject: table,
	selectedPart: null,
};

const MODS = { shift: false, alt: false, ctrl: false, meta: false };

const click = (mods: Partial<typeof MODS> = {}): SelectionControlEvent => ({
	type: "click",
	last: { x: 0, y: 0 },
	mods: { ...MODS, ...mods },
	subAction: undefined,
});

const EVERY_CELL = {
	selection: {
		kind: "textSlot",
		ranges: [{ anchorId: "r0c0", focusId: "r1c2" }],
	},
};

describe("handleTableCornerGrip", () => {
	it("picks every cell as one cell range, from the first cell to the last", () => {
		expect(handleTableCornerGrip(context, click())).toEqual(EVERY_CELL);
	});

	it("replaces a pick of tracks or of some cells", () => {
		for (const [kind, ranges] of [
			["row", [["0", "0"]]],
			["column", [["0", "2"]]],
			["textSlot", [["r0c0", "r1c1"]]],
		] as const) {
			expect(handleTableCornerGrip(pickedOn(kind, ranges), click())).toEqual(
				EVERY_CELL,
			);
		}
	});

	it("treats a click with Shift, Ctrl or Meta as a plain one", () => {
		for (const mods of [{ shift: true }, { ctrl: true }, { meta: true }]) {
			expect(handleTableCornerGrip(context, click(mods))).toEqual(EVERY_CELL);
			expect(
				handleTableCornerGrip(
					pickedOn("textSlot", [["r0c0", "r0c0"]]),
					click(mods),
				),
			).toEqual(EVERY_CELL);
		}
	});

	it("changes nothing when every cell is already picked, however the ranges run", () => {
		for (const ranges of [
			[["r0c0", "r1c2"]],
			[["r1c2", "r0c0"]],
			[["r0c2", "r1c0"]],
			[
				["r0c0", "r0c2"],
				["r1c0", "r1c2"],
			],
		] as const) {
			expect(
				handleTableCornerGrip(pickedOn("textSlot", ranges), click()),
			).toBeNull();
		}
	});

	it("writes no object, so a click on it is never a document change", () => {
		expect(handleTableCornerGrip(context, click())?.object).toBeUndefined();
	});

	it("ignores every gesture but the click", () => {
		const drag: SelectionControlEvent = {
			type: "drag",
			start: { x: 0, y: 0 },
			last: { x: 10, y: 0 },
			delta: { x: 10, y: 0 },
			mods: MODS,
			subAction: undefined,
		};

		expect(handleTableCornerGrip(context, drag)).toBeNull();
		expect(
			handleTableCornerGrip(context, { ...click(), type: "doubleClick" }),
		).toBeNull();
	});
});
