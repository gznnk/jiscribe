import { createCanvasRegistries, TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tablePlugin } from "../../plugin";
import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { TABLE_INSERT_COMMANDS } from "../tableInsertCommands";

// Inserting re-derives the box from the cells' text (see calcTableLayout.test.ts).
offerTextMeasurement(createEstimateTextMeasurement());

/** The cells of a grid written out as `[row][column]` text. */
const cellsOf = (rows: string[][]): Record<string, TableCell> => {
	const cells: Record<string, TableCell> = {};
	rows.forEach((row, rowIndex) => {
		row.forEach((text, columnIndex) => {
			cells[tableCellSlotId(rowIndex, columnIndex)] = { text };
		});
	});
	return cells;
};

/** A 2x2 table whose every cell says where it started. */
const TABLE = {
	id: "t-1",
	type: "table",
	cx: 500,
	cy: 400,
	width: 240,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	strokeWidth: 1,
	columns: [{ width: 120 }, { width: 120 }],
	rows: [{ height: 50 }, { height: 50 }],
	text: cellsOf([
		["r0c0", "r0c1"],
		["r1c0", "r1c1"],
	]),
} as unknown as TableState;

/**
 * A canvas holding that one table, selected, with `partSelection` standing on it.
 * Only the fields the commands read are filled in; the rest of the controller
 * state has no bearing on an insertion.
 */
const canvasWith = (
	partSelection: CanvasControllerState["objectPartSelection"],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [TABLE.id]: TABLE },
		selectedIds: [TABLE.id],
		objectPartSelection: partSelection,
		textEditState: null,
		commitVersion: 7,
		...overrides,
	}) as unknown as CanvasControllerState;

/**
 * The registry bundle the commands are handed, built the way a canvas builds it
 * — the table's own part kinds included, since that is what says which parts a
 * picked range covers.
 */
const registries = createCanvasRegistries({
	plugins: [tablePlugin],
}) as unknown as ICanvasRegistries;

const commandById = (id: string) => {
	const command = TABLE_INSERT_COMMANDS.find((entry) => entry.id === id);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

/** A pick of whole cells, one collapsed range each — what a cell click writes. */
const cellSelection = (partIds: string[]) => ({
	objectId: TABLE.id,
	kind: TEXT_SLOT_PART_KIND,
	ranges: partIds.map((partId) => ({ anchorId: partId, focusId: partId })),
});

/** The table the command left behind, or a failure when it changed nothing. */
const tableAfter = (
	commandId: string,
	state: CanvasControllerState,
): TableState => {
	const next = commandById(commandId).execute?.(state, registries);
	if (next === undefined) {
		throw new Error(`${commandId} has no execute`);
	}
	return next.objects[TABLE.id] as TableState;
};

/** The text of every cell, read back as `[row][column]`. */
const readGrid = (state: TableState): string[][] =>
	state.rows.map((_row, rowIndex) =>
		state.columns.map(
			(_column, columnIndex) =>
				state.text[tableCellSlotId(rowIndex, columnIndex)].text as string,
		),
	);

describe("TABLE_INSERT_COMMANDS", () => {
	it("contributes the four insertions under namespaced ids", () => {
		expect(TABLE_INSERT_COMMANDS.map((command) => command.id)).toEqual([
			"table.insertRowAbove",
			"table.insertRowBelow",
			"table.insertColumnLeft",
			"table.insertColumnRight",
		]);
	});

	it("inserts on the near side of a cell selection", () => {
		const state = canvasWith(cellSelection(["r1c1"]));

		expect(readGrid(tableAfter("table.insertRowAbove", state))).toEqual([
			["r0c0", "r0c1"],
			["", ""],
			["r1c0", "r1c1"],
		]);
		expect(readGrid(tableAfter("table.insertColumnLeft", state))).toEqual([
			["r0c0", "", "r0c1"],
			["r1c0", "", "r1c1"],
		]);
	});

	it("inserts on the far side of a cell selection", () => {
		const state = canvasWith(cellSelection(["r0c0"]));

		expect(readGrid(tableAfter("table.insertRowBelow", state))).toEqual([
			["r0c0", "r0c1"],
			["", ""],
			["r1c0", "r1c1"],
		]);
		expect(readGrid(tableAfter("table.insertColumnRight", state))).toEqual([
			["r0c0", "", "r0c1"],
			["r1c0", "", "r1c1"],
		]);
	});

	it("inserts outside the whole span of a cell range", () => {
		const range = canvasWith(cellSelection(["r0c0", "r0c1", "r1c0", "r1c1"]));

		expect(tableAfter("table.insertRowBelow", range).rows).toHaveLength(3);
		expect(readGrid(tableAfter("table.insertRowBelow", range))[2]).toEqual([
			"",
			"",
		]);
	});

	it("inserts relative to a track selection of its own axis", () => {
		const row = canvasWith({
			objectId: TABLE.id,
			kind: "row",
			ranges: [{ anchorId: "1", focusId: "1" }],
		});

		expect(readGrid(tableAfter("table.insertRowBelow", row))).toEqual([
			["r0c0", "r0c1"],
			["r1c0", "r1c1"],
			["", ""],
		]);
	});

	it("moves the live selection with the grid", () => {
		const state = canvasWith(cellSelection(["r1c0"]));
		const next = commandById("table.insertRowAbove").execute?.(
			state,
			registries,
		);

		// The cell that was picked is still the cell that is picked, one row down.
		expect(next?.objectPartSelection?.ranges).toEqual([
			{ anchorId: "r2c0", focusId: "r2c0" },
		]);
		expect(next?.commitVersion).toBe(8);
	});

	it("moves a track selection with the grid", () => {
		const state = canvasWith({
			objectId: TABLE.id,
			kind: "row",
			ranges: [{ anchorId: "1", focusId: "1" }],
		});
		const next = commandById("table.insertRowAbove").execute?.(
			state,
			registries,
		);

		expect(next?.objectPartSelection?.ranges).toEqual([
			{ anchorId: "2", focusId: "2" },
		]);
	});

	it("is unavailable without a part selection naming a track of its axis", () => {
		const canInsertRow = commandById("table.insertRowAbove").canExecute;
		const canInsertColumn = commandById("table.insertColumnLeft").canExecute;

		expect(canInsertRow(canvasWith(cellSelection(["r0c0"])), registries)).toBe(
			true,
		);
		// The table itself selected names no place to insert at.
		expect(canInsertRow(canvasWith(null), registries)).toBe(false);
		// A column tells an inserted row nothing about where it goes.
		expect(
			canInsertRow(
				canvasWith({
					objectId: TABLE.id,
					kind: "column",
					ranges: [{ anchorId: "0", focusId: "0" }],
				}),
				registries,
			),
		).toBe(false);
		expect(
			canInsertColumn(
				canvasWith({
					objectId: TABLE.id,
					kind: "column",
					ranges: [{ anchorId: "0", focusId: "0" }],
				}),
				registries,
			),
		).toBe(true);
	});

	it("is unavailable when the selection is not this one table's", () => {
		const canInsertRow = commandById("table.insertRowAbove").canExecute;

		expect(
			canInsertRow(
				canvasWith(cellSelection(["r0c0"]), { selectedIds: [] }),
				registries,
			),
		).toBe(false);
		expect(
			canInsertRow(
				canvasWith({
					objectId: "other",
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "r0c0", focusId: "r0c0" }],
				}),
				registries,
			),
		).toBe(false);
	});

	it("is unavailable while a cell is being edited, the arrows being the caret's", () => {
		const editing = canvasWith(cellSelection(["r0c0"]), {
			textEditState: {
				kind: "shape",
				objectId: TABLE.id,
				slotId: "r0c0",
				text: "",
			},
		} as unknown as Partial<CanvasControllerState>);

		expect(
			commandById("table.insertRowAbove").canExecute(editing, registries),
		).toBe(false);
	});

	it("binds Alt+Shift plus the arrow the new track appears in the direction of", () => {
		expect(commandById("table.insertRowAbove").shortcuts?.default).toEqual([
			{ code: "ArrowUp", alt: true, shift: true },
		]);
		expect(commandById("table.insertColumnRight").shortcuts?.default).toEqual([
			{ code: "ArrowRight", alt: true, shift: true },
		]);
	});
});
