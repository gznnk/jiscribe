import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentRecordSlot,
	extendRecordSlotSelection,
	selectAdjacentRecordSlot,
} from "./selectAdjacentRecordSlot";
import type { RecordSlotStepDirection } from "./selectAdjacentRecordSlot";

/** One command's id and wording. */
type RecordSlotSelectionCommandNaming = {
	id: string;
	label: LocaleMessages<string>;
};

/** The two commands one direction gets, and the arrow they answer to. */
type RecordSlotSelectionCommandSpec = {
	direction: RecordSlotStepDirection;
	/** The bare arrow's command, moving the pick to the neighbouring compartment. */
	select: RecordSlotSelectionCommandNaming;
	/** The Shift+arrow command, moving the active range's focus and keeping its anchor. */
	extend: RecordSlotSelectionCommandNaming;
	/** The arrow pointing the way the commands step. */
	arrowCode: string;
};

const RECORD_SLOT_SELECTION_COMMAND_SPECS: readonly RecordSlotSelectionCommandSpec[] =
	[
		{
			direction: "up",
			select: {
				id: "record.selectSlotUp",
				label: { en: "Select Compartment Above", ja: "上の区画を選択" },
			},
			extend: {
				id: "record.extendSlotSelectionUp",
				label: {
					en: "Extend Compartment Selection Up",
					ja: "選択範囲を上に広げる",
				},
			},
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			select: {
				id: "record.selectSlotDown",
				label: { en: "Select Compartment Below", ja: "下の区画を選択" },
			},
			extend: {
				id: "record.extendSlotSelectionDown",
				label: {
					en: "Extend Compartment Selection Down",
					ja: "選択範囲を下に広げる",
				},
			},
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			select: {
				id: "record.selectSlotLeft",
				label: { en: "Select Compartment Left", ja: "左の区画を選択" },
			},
			extend: {
				id: "record.extendSlotSelectionLeft",
				label: {
					en: "Extend Compartment Selection Left",
					ja: "選択範囲を左に広げる",
				},
			},
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			select: {
				id: "record.selectSlotRight",
				label: { en: "Select Compartment Right", ja: "右の区画を選択" },
			},
			extend: {
				id: "record.extendSlotSelectionRight",
				label: {
					en: "Extend Compartment Selection Right",
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
 * the top and bottom slot and for left and right: answering false there would
 * hand the key to the nudge and move the whole record.
 */
const createRecordSlotSelectionCommands = (
	spec: RecordSlotSelectionCommandSpec,
): Command[] => [
	{
		id: spec.select.id,
		label: spec.select.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode }] },
		canExecute: (state) => canSelectAdjacentRecordSlot(state),
		execute: (state) => selectAdjacentRecordSlot(state, spec.direction),
	},
	{
		id: spec.extend.id,
		label: spec.extend.label,
		category: "selection",
		shortcuts: { default: [{ code: spec.arrowCode, shift: true }] },
		canExecute: (state) => canSelectAdjacentRecordSlot(state),
		execute: (state) => extendRecordSlotSelection(state, spec.direction),
	},
];

/**
 * The record's slot-stepping commands, wired in through `CanvasPlugin.commands`:
 * the bare up and down arrows move a slot pick to the compartment above or below,
 * Shift+up and Shift+down widen or narrow the picked run that way, and left and
 * right (with or without Shift) leave the pick as it is. Only a slot pick claims
 * them; a whole record and every other shape leave the arrows to the built-in
 * nudge.
 */
export const RECORD_SLOT_SELECTION_COMMANDS: readonly Command[] =
	RECORD_SLOT_SELECTION_COMMAND_SPECS.flatMap(
		createRecordSlotSelectionCommands,
	);
