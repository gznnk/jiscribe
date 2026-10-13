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
	// `selection.part` names and would follow a step to another slot.
	canExecute: (state, registries) =>
		state.textEditState === null &&
		getTextSlotCycle(state, registries.objectPartKind) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, 1, registries.objectPartKind),
};
