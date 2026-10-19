import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentErEntityColumn,
	extendErEntityColumnSelection,
	selectAdjacentErEntityColumn,
} from "./selectAdjacentErEntityColumn";
import type { ErEntityColumnStepDirection } from "./selectAdjacentErEntityColumn";

/** One command's id and wording. */
type ErEntityColumnSelectionCommandNaming = {
	id: string;
	label: LocaleMessages<string>;
};

/** The two commands one direction gets, and the arrow they answer to. */
type ErEntityColumnSelectionCommandSpec = {
	direction: ErEntityColumnStepDirection;
	/** The bare arrow's command, moving the pick to the neighbouring column. */
	select: ErEntityColumnSelectionCommandNaming;
	/** The Shift+arrow command, moving the active range's focus and keeping its anchor. */
	extend: ErEntityColumnSelectionCommandNaming;
	/** The arrow pointing the way the commands step. */
	arrowCode: string;
};

const ER_ENTITY_COLUMN_SELECTION_COMMAND_SPECS: readonly ErEntityColumnSelectionCommandSpec[] =
	[
		{
			direction: "up",
			select: {
				id: "erEntity.selectColumnUp",
				label: { en: "Select Column Above", ja: "上のカラムを選択" },
			},
			extend: {
				id: "erEntity.extendColumnSelectionUp",
				label: {
					en: "Extend Column Selection Up",
					ja: "選択範囲を上に広げる",
				},
			},
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			select: {
				id: "erEntity.selectColumnDown",
				label: { en: "Select Column Below", ja: "下のカラムを選択" },
			},
			extend: {
				id: "erEntity.extendColumnSelectionDown",
				label: {
					en: "Extend Column Selection Down",
					ja: "選択範囲を下に広げる",
				},
			},
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			select: {
				id: "erEntity.selectColumnLeft",
				label: { en: "Select Column Left", ja: "左のカラムを選択" },
			},
			extend: {
				id: "erEntity.extendColumnSelectionLeft",
				label: {
					en: "Extend Column Selection Left",
					ja: "選択範囲を左に広げる",
				},
			},
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			select: {
				id: "erEntity.selectColumnRight",
				label: { en: "Select Column Right", ja: "右のカラムを選択" },
			},
			extend: {
				id: "erEntity.extendColumnSelectionRight",
				label: {
					en: "Extend Column Selection Right",
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
 * the top and bottom row and for left and right: answering false there would
 * hand the key to the nudge and move the whole entity. The modifier check is
 * exact, so Alt+Shift+Up / Down stays with the insertions.
 */
const createErEntityColumnSelectionCommands = (
	spec: ErEntityColumnSelectionCommandSpec,
): Command[] => [
	{
		id: spec.select.id,
		label: spec.select.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode }] },
		canExecute: (state) => canSelectAdjacentErEntityColumn(state),
		execute: (state) => selectAdjacentErEntityColumn(state, spec.direction),
	},
	{
		id: spec.extend.id,
		label: spec.extend.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode, shift: true }] },
		canExecute: (state) => canSelectAdjacentErEntityColumn(state),
		execute: (state) => extendErEntityColumnSelection(state, spec.direction),
	},
];

/**
 * The entity's column-stepping commands, wired in through
 * `CanvasPlugin.commands`: the bare up and down arrows move a column pick to the
 * row above or below, Shift+up and Shift+down widen or narrow the picked run
 * that way, and left and right (with or without Shift) leave the pick as it is.
 * Only a column pick claims them; a slot pick has its own
 * (ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS), and a whole entity and every other
 * shape leave the arrows to the built-in commands.
 */
export const ER_ENTITY_COLUMN_SELECTION_COMMANDS: readonly Command[] =
	ER_ENTITY_COLUMN_SELECTION_COMMAND_SPECS.flatMap(
		createErEntityColumnSelectionCommands,
	);
