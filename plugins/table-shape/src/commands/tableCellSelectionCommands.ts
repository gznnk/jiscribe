import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentTableCell,
	extendTableCellSelection,
	selectAdjacentTableCell,
} from "./selectAdjacentTableCell";
import type { TableCellStepDirection } from "./selectAdjacentTableCell";

/** One command's id and wording. */
type TableCellSelectionCommandNaming = {
	id: string;
	label: LocaleMessages<string>;
};

/** The two commands one direction gets, and the arrow they answer to. */
type TableCellSelectionCommandSpec = {
	direction: TableCellStepDirection;
	/** The bare arrow's command, moving the pick to the neighbouring cell. */
	select: TableCellSelectionCommandNaming;
	/** The Shift+arrow command, moving the active range's focus and keeping its anchor. */
	extend: TableCellSelectionCommandNaming;
	/** The arrow pointing the way the commands step. */
	arrowCode: string;
};

const TABLE_CELL_SELECTION_COMMAND_SPECS: readonly TableCellSelectionCommandSpec[] =
	[
		{
			direction: "up",
			select: {
				id: "table.selectCellUp",
				label: { en: "Select Cell Above", ja: "上のセルを選択" },
			},
			extend: {
				id: "table.extendCellSelectionUp",
				label: { en: "Extend Cell Selection Up", ja: "選択範囲を上に広げる" },
			},
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			select: {
				id: "table.selectCellDown",
				label: { en: "Select Cell Below", ja: "下のセルを選択" },
			},
			extend: {
				id: "table.extendCellSelectionDown",
				label: {
					en: "Extend Cell Selection Down",
					ja: "選択範囲を下に広げる",
				},
			},
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			select: {
				id: "table.selectCellLeft",
				label: { en: "Select Cell Left", ja: "左のセルを選択" },
			},
			extend: {
				id: "table.extendCellSelectionLeft",
				label: {
					en: "Extend Cell Selection Left",
					ja: "選択範囲を左に広げる",
				},
			},
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			select: {
				id: "table.selectCellRight",
				label: { en: "Select Cell Right", ja: "右のセルを選択" },
			},
			extend: {
				id: "table.extendCellSelectionRight",
				label: {
					en: "Extend Cell Selection Right",
					ja: "選択範囲を右に広げる",
				},
			},
			arrowCode: "ArrowRight",
		},
	];

/**
 * Builds a direction's bare-arrow and Shift+arrow commands. They share their
 * keys with the built-in nudge (Shift for the larger one) and take the keys from
 * it because a contributed command is offered a keystroke first
 * (CommandRegistry.findAllByShortcut), which is why `canExecute` stays true at
 * the grid's edge: answering false there would hand the key to the nudge and
 * move the whole table.
 */
const createTableCellSelectionCommands = (
	spec: TableCellSelectionCommandSpec,
): Command[] => [
	{
		id: spec.select.id,
		label: spec.select.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode }] },
		canExecute: (state) => canSelectAdjacentTableCell(state),
		execute: (state) => selectAdjacentTableCell(state, spec.direction),
	},
	{
		id: spec.extend.id,
		label: spec.extend.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode, shift: true }] },
		canExecute: (state) => canSelectAdjacentTableCell(state),
		execute: (state) => extendTableCellSelection(state, spec.direction),
	},
];

/**
 * The table's cell-stepping commands, wired in through `CanvasPlugin.commands`:
 * the bare arrows move a cell pick one cell up, down, left or right, and
 * Shift+arrow widens or narrows the picked range one cell that way. Only a cell
 * pick claims them; a whole table, a row or column pick and every other shape
 * leave the arrows to the built-in nudge.
 */
export const TABLE_CELL_SELECTION_COMMANDS: readonly Command[] =
	TABLE_CELL_SELECTION_COMMAND_SPECS.flatMap(createTableCellSelectionCommands);
