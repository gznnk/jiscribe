import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { tableCellSlotId } from "../../schema/TableDoc";
import type { TableCell } from "../../schema/TableDoc";
import type { TableState } from "../../state/TableState";
import { TABLE_REMOVE_COMMANDS } from "../tableRemoveCommands";

// Removing re-derives the box from the cells' text (see calcTableLayout.test.ts).
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

/** A 3x3 table whose every cell says where it started. */
const TABLE = {
	id: "t-1",
	type: "table",
	cx: 500,
	cy: 400,
	width: 360,
	height: 150,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	strokeWidth: 1,
	columns: [{ width: 120 }, { width: 120 }, { width: 120 }],
	rows: [{ height: 50 }, { height: 50 }, { height: 50 }],
	text: cellsOf([
		["r0c0", "r0c1", "r0c2"],
		["r1c0", "r1c1", "r1c2"],
		["r2c0", "r2c1", "r2c2"],
	]),
} as unknown as TableState;

/** That table cut down to a single row and a single column, the removal floor. */
const SMALLEST = {
	...TABLE,
	columns: [{ width: 120 }],
	rows: [{ height: 50 }],
	text: cellsOf([["only"]]),
} as unknown as TableState;

/**
 * A canvas holding one table, selected, with `partSelection` standing on it.
 * Only the fields the commands read are filled in.
 */
const canvasWith = (
	table: TableState,
	partSelection: CanvasControllerState["objectPartSelection"],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [TABLE.id]: table },
		selectedIds: [TABLE.id],
		objectPartSelection: partSelection,
		textEditState: null,
		commitVersion: 7,
		...overrides,
	}) as unknown as CanvasControllerState;

/** The registries parameter every command takes and none of these reads. */
const NO_REGISTRIES = undefined as unknown as ICanvasRegistries;

const commandById = (id: string) => {
	const command = TABLE_REMOVE_COMMANDS.find((entry) => entry.id === id);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

const trackSelection = (kind: string, partIds: string[]) => ({
	objectId: TABLE.id,
	kind,
	partIds,
});

/** The text of every cell, read back as `[row][column]`. */
const readGrid = (state: TableState): string[][] =>
	state.rows.map((_row, rowIndex) =>
		state.columns.map(
			(_column, columnIndex) =>
				state.text[tableCellSlotId(rowIndex, columnIndex)].text as string,
		),
	);

describe("TABLE_REMOVE_COMMANDS", () => {
	it("contributes the two removals under namespaced ids", () => {
		expect(TABLE_REMOVE_COMMANDS.map((command) => command.id)).toEqual([
			"table.deleteRow",
			"table.deleteColumn",
		]);
	});

	it("takes the track a grip selected and renumbers the grid behind it", () => {
		const state = canvasWith(TABLE, trackSelection("row", ["1"]));
		const next = commandById("table.deleteRow").execute?.(state, NO_REGISTRIES);

		expect(readGrid(next?.objects[TABLE.id] as TableState)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r2c0", "r2c1", "r2c2"],
		]);
		expect(next?.commitVersion).toBe(8);
	});

	it("takes the track a picked cell stands in, the command naming what the key would have to guess", () => {
		const state = canvasWith(
			TABLE,
			trackSelection(TEXT_SLOT_PART_KIND, ["r1c2"]),
		);

		const rowGone = commandById("table.deleteRow").execute?.(
			state,
			NO_REGISTRIES,
		);
		expect(readGrid(rowGone?.objects[TABLE.id] as TableState)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r2c0", "r2c1", "r2c2"],
		]);

		const columnGone = commandById("table.deleteColumn").execute?.(
			state,
			NO_REGISTRIES,
		);
		expect(readGrid(columnGone?.objects[TABLE.id] as TableState)).toEqual([
			["r0c0", "r0c1"],
			["r1c0", "r1c1"],
			["r2c0", "r2c1"],
		]);
	});

	it("takes every track a range names at once", () => {
		const state = canvasWith(
			TABLE,
			trackSelection(TEXT_SLOT_PART_KIND, ["r0c0", "r1c0"]),
		);
		const next = commandById("table.deleteRow").execute?.(state, NO_REGISTRIES);

		expect(readGrid(next?.objects[TABLE.id] as TableState)).toEqual([
			["r2c0", "r2c1", "r2c2"],
		]);
	});

	it("drops the part selection, the parts it pointed at being gone", () => {
		const state = canvasWith(TABLE, trackSelection("row", ["1"]));
		const next = commandById("table.deleteRow").execute?.(state, NO_REGISTRIES);

		expect(next?.objectPartSelection).toBeNull();
		expect(next?.selectedIds).toEqual([TABLE.id]);
	});

	it("is unavailable without a part selection naming a track of its axis", () => {
		const canDeleteRow = commandById("table.deleteRow").canExecute;

		expect(canDeleteRow(canvasWith(TABLE, null), NO_REGISTRIES)).toBe(false);
		expect(
			canDeleteRow(
				canvasWith(TABLE, trackSelection("column", ["0"])),
				NO_REGISTRIES,
			),
		).toBe(false);
		expect(
			canDeleteRow(
				canvasWith(TABLE, trackSelection("row", ["0"])),
				NO_REGISTRIES,
			),
		).toBe(true);
	});

	it("is unavailable at the last row and the last column, which cannot be taken away", () => {
		const onlyRow = canvasWith(SMALLEST, trackSelection("row", ["0"]));
		const onlyColumn = canvasWith(SMALLEST, trackSelection("column", ["0"]));

		expect(
			commandById("table.deleteRow").canExecute(onlyRow, NO_REGISTRIES),
		).toBe(false);
		expect(
			commandById("table.deleteColumn").canExecute(onlyColumn, NO_REGISTRIES),
		).toBe(false);
		// And the refusal leaves the canvas alone rather than half-applying.
		expect(
			commandById("table.deleteRow").execute?.(onlyRow, NO_REGISTRIES),
		).toBe(onlyRow);
	});

	it("is unavailable while a cell is being edited, Delete being the caret's", () => {
		const editing = canvasWith(
			TABLE,
			trackSelection(TEXT_SLOT_PART_KIND, ["r0c0"]),
			{
				textEditState: {
					kind: "shape",
					objectId: TABLE.id,
					slotId: "r0c0",
					text: "",
				},
			} as unknown as Partial<CanvasControllerState>,
		);

		expect(
			commandById("table.deleteRow").canExecute(editing, NO_REGISTRIES),
		).toBe(false);
	});

	it("carries no shortcut, Delete over a grip already being one", () => {
		expect(commandById("table.deleteRow").shortcuts).toBeUndefined();
		expect(commandById("table.deleteColumn").shortcuts).toBeUndefined();
	});
});
