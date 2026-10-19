import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentErEntityTextSlot,
	extendErEntityTextSlotSelection,
	selectAdjacentErEntityTextSlot,
} from "./selectAdjacentErEntityTextSlot";
import type { ErEntityTextSlotStepDirection } from "./selectAdjacentErEntityTextSlot";

/** One command's id and wording. */
type ErEntityTextSlotSelectionCommandNaming = {
	id: string;
	label: LocaleMessages<string>;
};

/** The two commands one direction gets, and the arrow they answer to. */
type ErEntityTextSlotSelectionCommandSpec = {
	direction: ErEntityTextSlotStepDirection;
	/** The bare arrow's command, moving the pick to the neighbouring slot. */
	select: ErEntityTextSlotSelectionCommandNaming;
	/** The Shift+arrow command, moving the active range's focus and keeping its anchor. */
	extend: ErEntityTextSlotSelectionCommandNaming;
	/** The arrow pointing the way the commands step. */
	arrowCode: string;
};

const ER_ENTITY_TEXT_SLOT_SELECTION_COMMAND_SPECS: readonly ErEntityTextSlotSelectionCommandSpec[] =
	[
		{
			direction: "up",
			select: {
				id: "erEntity.selectTextSlotUp",
				label: { en: "Select Text Above", ja: "上のテキストを選択" },
			},
			extend: {
				id: "erEntity.extendTextSlotSelectionUp",
				label: {
					en: "Extend Text Selection Up",
					ja: "選択範囲を上に広げる",
				},
			},
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			select: {
				id: "erEntity.selectTextSlotDown",
				label: { en: "Select Text Below", ja: "下のテキストを選択" },
			},
			extend: {
				id: "erEntity.extendTextSlotSelectionDown",
				label: {
					en: "Extend Text Selection Down",
					ja: "選択範囲を下に広げる",
				},
			},
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			select: {
				id: "erEntity.selectTextSlotLeft",
				label: { en: "Select Text Left", ja: "左のテキストを選択" },
			},
			extend: {
				id: "erEntity.extendTextSlotSelectionLeft",
				label: {
					en: "Extend Text Selection Left",
					ja: "選択範囲を左に広げる",
				},
			},
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			select: {
				id: "erEntity.selectTextSlotRight",
				label: { en: "Select Text Right", ja: "右のテキストを選択" },
			},
			extend: {
				id: "erEntity.extendTextSlotSelectionRight",
				label: {
					en: "Extend Text Selection Right",
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
 * move the whole entity. They share the keys with the column commands too, which
 * claim them over a column pick only.
 */
const createErEntityTextSlotSelectionCommands = (
	spec: ErEntityTextSlotSelectionCommandSpec,
): Command[] => [
	{
		id: spec.select.id,
		label: spec.select.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode }] },
		canExecute: (state) => canSelectAdjacentErEntityTextSlot(state),
		execute: (state) => selectAdjacentErEntityTextSlot(state, spec.direction),
	},
	{
		id: spec.extend.id,
		label: spec.extend.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode, shift: true }] },
		canExecute: (state) => canSelectAdjacentErEntityTextSlot(state),
		execute: (state) => extendErEntityTextSlotSelection(state, spec.direction),
	},
];

/**
 * The entity's slot-stepping commands, wired in through `CanvasPlugin.commands`:
 * the bare arrows move a slot pick one slot up, down, left or right, and
 * Shift+arrow widens or narrows the picked range one slot that way. Only a slot
 * pick claims them; a column pick has its own (ER_ENTITY_COLUMN_SELECTION_COMMANDS),
 * and a whole entity and every other shape leave the arrows to the built-in nudge.
 */
export const ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS: readonly Command[] =
	ER_ENTITY_TEXT_SLOT_SELECTION_COMMAND_SPECS.flatMap(
		createErEntityTextSlotSelectionCommands,
	);
