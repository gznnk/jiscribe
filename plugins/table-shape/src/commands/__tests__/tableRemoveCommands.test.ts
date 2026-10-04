import { TEXT_SLOT_PART_KIND, createCanvasRegistries } from "@jiscribe/canvas";
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
	partSelection: CanvasControllerState["selection"]["part"],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [TABLE.id]: table },
		selection: { objectIds: [TABLE.id], part: partSelection },
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
	const command = TABLE_REMOVE_COMMANDS.find((entry) => entry.id === id);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

/** A pick of whole tracks, one collapsed range each — what a grip writes. */
const trackSelection = (kind: string, partIds: string[]) => ({
	kind,
	ranges: partIds.map((partId) => ({ anchorId: partId, focusId: partId })),
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
		const next = commandById("table.deleteRow").execute?.(state, registries);

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

		const rowGone = commandById("table.deleteRow").execute?.(state, registries);
		expect(readGrid(rowGone?.objects[TABLE.id] as TableState)).toEqual([
			["r0c0", "r0c1", "r0c2"],
			["r2c0", "r2c1", "r2c2"],
		]);

		const columnGone = commandById("table.deleteColumn").execute?.(
			state,
			registries,
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
		const next = commandById("table.deleteRow").execute?.(state, registries);

		expect(readGrid(next?.objects[TABLE.id] as TableState)).toEqual([
			["r2c0", "r2c1", "r2c2"],
		]);
	});

	it("drops the part selection, the parts it pointed at being gone", () => {
		const state = canvasWith(TABLE, trackSelection("row", ["1"]));
		const next = commandById("table.deleteRow").execute?.(state, registries);

		expect(next?.selection.part).toBeNull();
		expect(next?.selection.objectIds).toEqual([TABLE.id]);
	});

	it("is unavailable without a part selection naming a track of its axis", () => {
		const canDeleteRow = commandById("table.deleteRow").canExecute;

		expect(canDeleteRow(canvasWith(TABLE, null), registries)).toBe(false);
		expect(
			canDeleteRow(
				canvasWith(TABLE, trackSelection("column", ["0"])),
				registries,
			),
		).toBe(false);
		expect(
			canDeleteRow(canvasWith(TABLE, trackSelection("row", ["0"])), registries),
		).toBe(true);
	});

	it("is unavailable at the last row and the last column, which cannot be taken away", () => {
		const onlyRow = canvasWith(SMALLEST, trackSelection("row", ["0"]));
		const onlyColumn = canvasWith(SMALLEST, trackSelection("column", ["0"]));

		expect(commandById("table.deleteRow").canExecute(onlyRow, registries)).toBe(
			false,
		);
		expect(
			commandById("table.deleteColumn").canExecute(onlyColumn, registries),
		).toBe(false);
		// And the refusal leaves the canvas alone rather than half-applying.
		expect(commandById("table.deleteRow").execute?.(onlyRow, registries)).toBe(
			onlyRow,
		);
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

		expect(commandById("table.deleteRow").canExecute(editing, registries)).toBe(
			false,
		);
	});

	it("carries no shortcut, Delete over a grip already being one", () => {
		expect(commandById("table.deleteRow").shortcuts).toBeUndefined();
		expect(commandById("table.deleteColumn").shortcuts).toBeUndefined();
	});
});
