import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import { describe, expect, it } from "vitest";

import { tableCellTextSlotId } from "../../../schema/TableDoc";
import type { TableCell } from "../../../schema/TableDoc";
import type { TableState } from "../../../state/TableState";
import { createTableTrackGripHandler } from "../createTableTrackGripHandler";

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

/** A 5x1 table, for ranges of rows; its row indices are 0 to 4. */
const tallTable = {
	...table,
	columns: [{ width: 100 }],
	rows: Array.from({ length: 5 }, () => ({ height: 50 })),
	text: emptyCells(5, 1),
} as unknown as TableState;

const context: SelectionControlContext<TableState> = {
	object: table,
	startObject: table,
	selectedPart: null,
};

/** The tall table with `ranges` of `kind` standing on it. */
const pickedOnTallTable = (
	kind: string,
	ranges: readonly (readonly [string, string])[],
): SelectionControlContext<TableState> => ({
	object: tallTable,
	startObject: tallTable,
	selectedPart: {
		kind,
		ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
	},
});

const MODS = { shift: false, alt: false, ctrl: false, meta: false };

const clickOn = (
	subAction: string | undefined,
	mods: Partial<typeof MODS> = {},
): SelectionControlEvent => ({
	type: "click",
	last: { x: 0, y: 0 },
	mods: { ...MODS, ...mods },
	subAction,
});

/** The selection a handler result writes, as `[anchorId, focusId]` pairs. */
const writtenRanges = (
	result: ReturnType<ReturnType<typeof createTableTrackGripHandler>>,
): (readonly [string, string])[] | null | undefined => {
	const selection = result?.selection;
	if (selection === undefined || selection === null) {
		return selection;
	}
	return selection.ranges.map((range) => [range.anchorId, range.focusId]);
};

const handleRowGrip = createTableTrackGripHandler("row");
const handleColumnGrip = createTableTrackGripHandler("column");

describe("createTableTrackGripHandler", () => {
	it("selects the whole track the grip stands for, as its own kind", () => {
		expect(handleRowGrip(context, clickOn("1"))).toEqual({
			selection: { kind: "row", ranges: [{ anchorId: "1", focusId: "1" }] },
		});
		expect(handleColumnGrip(context, clickOn("2"))).toEqual({
			selection: { kind: "column", ranges: [{ anchorId: "2", focusId: "2" }] },
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
			subAction: "0",
		};

		expect(handleRowGrip(context, drag)).toBeNull();
		expect(
			handleRowGrip(context, { ...clickOn("0"), type: "doubleClick" }),
		).toBeNull();
	});

	describe("Shift-click", () => {
		it("moves the active range's focus to the track, keeping its anchor and the earlier ranges", () => {
			const result = handleRowGrip(
				pickedOnTallTable("row", [
					["0", "0"],
					["2", "2"],
				]),
				clickOn("4", { shift: true }),
			);

			expect(result?.selection?.kind).toBe("row");
			expect(writtenRanges(result)).toEqual([
				["0", "0"],
				["2", "4"],
			]);
		});

		it("runs the range back past its anchor", () => {
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["2", "4"]]),
						clickOn("0", { shift: true }),
					),
				),
			).toEqual([["2", "0"]]);
		});

		it("changes nothing when the focus already is the track", () => {
			expect(
				handleRowGrip(
					pickedOnTallTable("row", [["1", "3"]]),
					clickOn("3", { shift: true }),
				),
			).toBeNull();
		});

		it("is a plain click over a pick of the other axis or of cells", () => {
			for (const kind of ["column", "textSlot"]) {
				expect(
					writtenRanges(
						handleRowGrip(
							pickedOnTallTable(kind, [["0", "0"]]),
							clickOn("3", { shift: true }),
						),
					),
				).toEqual([["3", "3"]]);
			}
			expect(
				writtenRanges(handleRowGrip(context, clickOn("1", { shift: true }))),
			).toEqual([["1", "1"]]);
		});
	});

	describe("Ctrl / Meta-click", () => {
		it("adds a track no range covers as a range of its own, last", () => {
			for (const mods of [{ ctrl: true }, { meta: true }]) {
				expect(
					writtenRanges(
						handleRowGrip(
							pickedOnTallTable("row", [["0", "1"]]),
							clickOn("3", mods),
						),
					),
				).toEqual([
					["0", "1"],
					["3", "3"],
				]);
			}
		});

		it("takes a track out of the middle of a range, splitting it in the range's direction", () => {
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["0", "4"]]),
						clickOn("2", { ctrl: true }),
					),
				),
			).toEqual([
				["0", "1"],
				["3", "4"],
			]);
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["4", "0"]]),
						clickOn("2", { meta: true }),
					),
				),
			).toEqual([
				["4", "3"],
				["1", "0"],
			]);
		});

		it("takes a track off either end of a range", () => {
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["1", "3"]]),
						clickOn("1", { ctrl: true }),
					),
				),
			).toEqual([["2", "3"]]);
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["1", "3"]]),
						clickOn("3", { ctrl: true }),
					),
				),
			).toEqual([["1", "2"]]);
		});

		it("takes the track out of every range covering it", () => {
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [
							["0", "2"],
							["2", "2"],
							["4", "4"],
						]),
						clickOn("2", { ctrl: true }),
					),
				),
			).toEqual([
				["0", "1"],
				["4", "4"],
			]);
		});

		it("clears the pick when the last picked track is taken out", () => {
			expect(
				handleRowGrip(
					pickedOnTallTable("row", [["1", "1"]]),
					clickOn("1", { ctrl: true }),
				),
			).toEqual({ selection: null });
		});

		it("toggles even with Shift held", () => {
			expect(
				writtenRanges(
					handleRowGrip(
						pickedOnTallTable("row", [["0", "0"]]),
						clickOn("3", { ctrl: true, shift: true }),
					),
				),
			).toEqual([
				["0", "0"],
				["3", "3"],
			]);
		});

		it("is a plain click over a pick of the other axis", () => {
			expect(
				writtenRanges(
					handleColumnGrip(
						pickedOnTallTable("row", [["0", "0"]]),
						clickOn("0", { ctrl: true }),
					),
				),
			).toEqual([["0", "0"]]);
			expect(
				handleColumnGrip(
					pickedOnTallTable("row", [["0", "0"]]),
					clickOn("0", { ctrl: true }),
				)?.selection?.kind,
			).toBe("column");
		});
	});
});
