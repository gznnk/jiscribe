import type { ExecutableCommand } from "../CommandTypes";
import {
	getTextSlotCycleTarget,
	selectAdjacentTextSlot,
} from "./utils/selectAdjacentTextSlot";

export const SelectPreviousTextSlotCommand: ExecutableCommand = {
	id: "selectPreviousTextSlot",
	label: { en: "Select Previous Text Slot", ja: "前のテキストスロットを選択" },
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab", shift: true }],
	},

	canExecute: (state) => getTextSlotCycleTarget(state) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, -1, registries.objectPart),
};
