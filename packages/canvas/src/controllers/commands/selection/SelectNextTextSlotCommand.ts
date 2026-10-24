import {
	getTextSlotCycle,
	selectAdjacentTextSlot,
} from "../../selection/writers/selectAdjacentTextSlot";
import type { ExecutableCommand } from "../CommandTypes";

export const SelectNextTextSlotCommand: ExecutableCommand = {
	id: "selectNextTextSlot",
	label: { en: "Select Next Text Slot", ja: "次のテキストスロットを選択" },
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab" }],
	},

	// Disabled while a text edit is open: the draft is bound to the slot
	// `selection.part` names and would follow a step to another slot. The
	// editor's own Tab commits before it steps (STEP_TEXT_EDIT).
	canExecute: (state, registries) =>
		state.mode.kind !== "textEdit" &&
		getTextSlotCycle(state, registries.objectPartKind) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, 1, registries.objectPartKind),
};
