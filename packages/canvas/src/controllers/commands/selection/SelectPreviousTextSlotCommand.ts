import {
	getTextSlotCycle,
	selectAdjacentTextSlot,
} from "../../selection/writers/selectAdjacentTextSlot";
import type { ExecutableCommand } from "../CommandTypes";

export const SelectPreviousTextSlotCommand: ExecutableCommand = {
	id: "selectPreviousTextSlot",
	label: { en: "Select Previous Text Slot", ja: "前のテキストスロットを選択" },
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab", shift: true }],
	},

	// Disabled while a text edit is open: the draft is bound to the slot
	// `selection.part` names and would follow a step to another slot. The
	// editor's own Tab commits before it steps (STEP_TEXT_EDIT).
	canExecute: (state, registries) =>
		state.textEditState === null &&
		getTextSlotCycle(state, registries.objectPartKind) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, -1, registries.objectPartKind),
};
