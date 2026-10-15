import type { Command, LocaleMessages } from "@jiscribe/canvas-sdk";

import {
	canSelectAdjacentRecordSlot,
	selectAdjacentRecordSlot,
} from "./selectAdjacentRecordSlot";
import type { RecordSlotStepDirection } from "./selectAdjacentRecordSlot";

/** One step command's id, wording and key. */
type RecordSlotSelectionCommandSpec = {
	direction: RecordSlotStepDirection;
	id: string;
	label: LocaleMessages<string>;
	/** The bare arrow the command answers to, the one pointing the way it steps. */
	arrowCode: string;
};

const RECORD_SLOT_SELECTION_COMMAND_SPECS: readonly RecordSlotSelectionCommandSpec[] =
	[
		{
			direction: "up",
			id: "record.selectSlotUp",
			label: { en: "Select Compartment Above", ja: "上の区画を選択" },
			arrowCode: "ArrowUp",
		},
		{
			direction: "down",
			id: "record.selectSlotDown",
			label: { en: "Select Compartment Below", ja: "下の区画を選択" },
			arrowCode: "ArrowDown",
		},
		{
			direction: "left",
			id: "record.selectSlotLeft",
			label: { en: "Select Compartment Left", ja: "左の区画を選択" },
			arrowCode: "ArrowLeft",
		},
		{
			direction: "right",
			id: "record.selectSlotRight",
			label: { en: "Select Compartment Right", ja: "右の区画を選択" },
			arrowCode: "ArrowRight",
		},
	];

/**
 * Builds one step command. It shares its bare arrow with the built-in nudge and
 * takes the key from it because a contributed command is offered a keystroke
 * first (CommandRegistry.findAllByShortcut), which is why `canExecute` stays true
 * at the top and bottom slot and for left and right: answering false there would
 * hand the key to the nudge and move the whole record.
 */
const createRecordSlotSelectionCommand = (
	spec: RecordSlotSelectionCommandSpec,
): Command => ({
	id: spec.id,
	label: spec.label,
	category: "selection",
	shortcuts: { default: [{ code: spec.arrowCode }] },
	canExecute: (state) => canSelectAdjacentRecordSlot(state),
	execute: (state) => selectAdjacentRecordSlot(state, spec.direction),
});

/**
 * The record's slot-stepping commands, wired in through `CanvasPlugin.commands`:
 * the bare up and down arrows move a slot pick to the compartment above or below,
 * and left and right leave the pick as it is. Only a slot pick claims them; a
 * whole record and every other shape leave the arrows to the built-in nudge.
 */
export const RECORD_SLOT_SELECTION_COMMANDS: readonly Command[] =
	RECORD_SLOT_SELECTION_COMMAND_SPECS.map(createRecordSlotSelectionCommand);
