import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableCellTextSlotIds } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import {
	canSelectAdjacentTableCell,
	extendTableCellSelection,
	selectAdjacentTableCell,
} from "../selectAdjacentTableCell";

/** A 3x3 table, so a step can start from a cell with a neighbour on every side. */
const TABLE = {
	id: "t-1",
	type: "table",
	columns: [{ width: 80 }, { width: 80 }, { width: 80 }],
	rows: [{ height: 40 }, { height: 40 }, { height: 40 }],
	text: Object.fromEntries(
		tableCellTextSlotIds(3, 3).map((cellId) => [cellId, { text: cellId }]),
	),
} as unknown as TableState;

/** Only the fields the step reads; the rest of the controller state has no bearing on it. */
const canvasWith = (
	part: CanvasControllerState["selection"]["part"],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: {
			[TABLE.id]: TABLE,
			"rect-1": { id: "rect-1", type: "rect" },
		},
		selection: { objectIds: [TABLE.id], part },
		textEditState: null,
		activeDrag: null,
		objectMenuOpenId: "t-1",
		...overrides,
	}) as unknown as CanvasControllerState;

/** A pick of whole cells, one collapsed range each — what a cell click writes. */
const cellSelection = (cellIds: string[]) => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: cellIds.map((cellId) => ({ anchorId: cellId, focusId: cellId })),
});

/** The cell ranges the step left picked. */
const rangesAfter = (
	state: CanvasControllerState,
	direction: Parameters<typeof selectAdjacentTableCell>[1],
) => selectAdjacentTableCell(state, direction).selection.part?.ranges;

describe("selectAdjacentTableCell", () => {
	it("moves a single picked cell one cell in each direction", () => {
		const state = canvasWith(cellSelection(["r1c1"]));
		const collapsed = (cellId: string) => [
			{ anchorId: cellId, focusId: cellId },
		];

		expect(rangesAfter(state, "up")).toEqual(collapsed("r0c1"));
		expect(rangesAfter(state, "down")).toEqual(collapsed("r2c1"));
		expect(rangesAfter(state, "left")).toEqual(collapsed("r1c0"));
		expect(rangesAfter(state, "right")).toEqual(collapsed("r1c2"));
	});

	it("keeps the part kind and closes an open ObjectMenu submenu", () => {
		const next = selectAdjacentTableCell(
			canvasWith(cellSelection(["r1c1"])),
			"up",
		);

		expect(next.selection.part?.kind).toBe(TEXT_SLOT_PART_KIND);
		expect(next.selection.objectIds).toEqual([TABLE.id]);
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("hands back the input state at the grid's edge", () => {
		for (const [cellId, direction] of [
			["r0c1", "up"],
			["r2c1", "down"],
			["r1c0", "left"],
			["r1c2", "right"],
		] as const) {
			const state = canvasWith(cellSelection([cellId]));
			expect(canSelectAdjacentTableCell(state)).toBe(true);
			expect(selectAdjacentTableCell(state, direction)).toBe(state);
		}
	});

	it("collapses a range to the neighbour of its focus", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "r0c0", focusId: "r1c1" }],
		});

		expect(rangesAfter(state, "right")).toEqual([
			{ anchorId: "r1c2", focusId: "r1c2" },
		]);
		// The anchor's side of the range is not where the step starts from.
		expect(rangesAfter(state, "up")).toEqual([
			{ anchorId: "r0c1", focusId: "r0c1" },
		]);
	});

	it("collapses a range onto its focus at the grid's edge", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "r2c2", focusId: "r0c2" }],
		});

		expect(rangesAfter(state, "up")).toEqual([
			{ anchorId: "r0c2", focusId: "r0c2" },
		]);
	});

	it("steps from the focus of the last range of a Ctrl-built pick", () => {
		const state = canvasWith(cellSelection(["r2c2", "r0c0"]));

		expect(rangesAfter(state, "down")).toEqual([
			{ anchorId: "r1c0", focusId: "r1c0" },
		]);
	});
});

describe("extendTableCellSelection", () => {
	/** The cell ranges the extension left picked. */
	const extendedRangesAfter = (
		state: CanvasControllerState,
		direction: Parameters<typeof extendTableCellSelection>[1],
	) => extendTableCellSelection(state, direction).selection.part?.ranges;

	it("widens a single picked cell into a range anchored on it", () => {
		const state = canvasWith(cellSelection(["r1c1"]));

		expect(extendedRangesAfter(state, "up")).toEqual([
			{ anchorId: "r1c1", focusId: "r0c1" },
		]);
		expect(extendedRangesAfter(state, "right")).toEqual([
			{ anchorId: "r1c1", focusId: "r1c2" },
		]);
	});

	it("moves the focus away from the anchor and back towards it", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "r0c0", focusId: "r1c1" }],
		});

		expect(extendedRangesAfter(state, "down")).toEqual([
			{ anchorId: "r0c0", focusId: "r2c1" },
		]);
		expect(extendedRangesAfter(state, "left")).toEqual([
			{ anchorId: "r0c0", focusId: "r1c0" },
		]);
		// Shrunk back onto the anchor, the range is that one cell again.
		const shrunk = extendTableCellSelection(
			extendTableCellSelection(state, "left"),
			"up",
		);
		expect(shrunk.selection.part?.ranges).toEqual([
			{ anchorId: "r0c0", focusId: "r0c0" },
		]);
	});

	it("crosses the anchor, turning the range the other way", () => {
		const state = canvasWith(cellSelection(["r1c1"]));
		const crossed = extendTableCellSelection(
			extendTableCellSelection(state, "right"),
			"left",
		);

		expect(extendedRangesAfter(crossed, "left")).toEqual([
			{ anchorId: "r1c1", focusId: "r1c0" },
		]);
	});

	it("keeps the part kind and closes an open ObjectMenu submenu", () => {
		const next = extendTableCellSelection(
			canvasWith(cellSelection(["r1c1"])),
			"up",
		);

		expect(next.selection.part?.kind).toBe(TEXT_SLOT_PART_KIND);
		expect(next.selection.objectIds).toEqual([TABLE.id]);
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("hands back the input state when the focus is at the grid's edge", () => {
		for (const [focusId, direction] of [
			["r0c1", "up"],
			["r2c1", "down"],
			["r1c0", "left"],
			["r1c2", "right"],
		] as const) {
			const state = canvasWith({
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "r1c1", focusId }],
			});
			expect(canSelectAdjacentTableCell(state)).toBe(true);
			expect(extendTableCellSelection(state, direction)).toBe(state);
		}
	});

	it("extends only the last range of a Ctrl-built pick, keeping the others", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "r0c0", focusId: "r0c1" },
				{ anchorId: "r2c2", focusId: "r2c2" },
			],
		});

		expect(extendedRangesAfter(state, "up")).toEqual([
			{ anchorId: "r0c0", focusId: "r0c1" },
			{ anchorId: "r2c2", focusId: "r1c2" },
		]);
	});

	it("leaves a table selected as a whole or a cell being edited alone", () => {
		for (const state of [
			canvasWith(null),
			canvasWith(cellSelection(["r0c0"]), {
				textEditState: { objectId: TABLE.id } as never,
			}),
		]) {
			expect(extendTableCellSelection(state, "down")).toBe(state);
		}
	});
});

describe("canSelectAdjacentTableCell", () => {
	it("is true for a cell pick on the sole selected table", () => {
		expect(
			canSelectAdjacentTableCell(canvasWith(cellSelection(["r0c0"]))),
		).toBe(true);
	});

	it("is false for every other context, leaving the keys to the nudge", () => {
		const contexts: Record<string, CanvasControllerState> = {
			"whole table": canvasWith(null),
			"row pick": canvasWith({
				kind: "row",
				ranges: [{ anchorId: "1", focusId: "1" }],
			}),
			"text edit open": canvasWith(cellSelection(["r0c0"]), {
				textEditState: { objectId: TABLE.id } as never,
			}),
			"drag running": canvasWith(cellSelection(["r0c0"]), {
				activeDrag: {} as never,
			}),
			"another shape": canvasWith(null, {
				selection: { objectIds: ["rect-1"], part: null },
			}),
			"table with another shape": canvasWith(null, {
				selection: { objectIds: [TABLE.id, "rect-1"], part: null },
			}),
		};
		for (const [name, state] of Object.entries(contexts)) {
			expect({ name, can: canSelectAdjacentTableCell(state) }).toEqual({
				name,
				can: false,
			});
			expect(selectAdjacentTableCell(state, "up")).toBe(state);
		}
	});
});

describe("bare arrow routing with the table plugin", () => {
	const registries = createCanvasRegistries({ plugins: [tablePlugin] });
	/** The same bundle as the narrow view a command's `canExecute` is handed. */
	const commandRegistries = registries as unknown as ICanvasRegistries;

	/** The command an ArrowUp runs in `state`: the first match whose `canExecute` passes. */
	const arrowUpCommandId = (
		state: CanvasControllerState,
		shiftKey = false,
	): string | undefined =>
		registries.command
			.findAllByShortcut({
				code: "ArrowUp",
				key: "ArrowUp",
				ctrlKey: false,
				metaKey: false,
				shiftKey,
				altKey: false,
			} as KeyboardEvent)
			.find((command) => command.canExecute(state, commandRegistries))?.id;

	it("steps the cell pick instead of nudging the table", () => {
		expect(arrowUpCommandId(canvasWith(cellSelection(["r1c1"])))).toBe(
			"table.selectCellUp",
		);
		// At the edge too, or the key would fall through and move the table.
		expect(arrowUpCommandId(canvasWith(cellSelection(["r0c1"])))).toBe(
			"table.selectCellUp",
		);
	});

	it("extends the cell pick with Shift instead of nudging the table further", () => {
		expect(arrowUpCommandId(canvasWith(cellSelection(["r1c1"])), true)).toBe(
			"table.extendCellSelectionUp",
		);
		// At the edge too, or the key would fall through to the large nudge.
		expect(arrowUpCommandId(canvasWith(cellSelection(["r0c1"])), true)).toBe(
			"table.extendCellSelectionUp",
		);
	});

	it("leaves the nudge to a table selected as a whole", () => {
		expect(arrowUpCommandId(canvasWith(null))).toBe("move-up");
		expect(arrowUpCommandId(canvasWith(null), true)).toBe("move-up-large");
	});
});
