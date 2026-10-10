import {
	getTextSlotCycleTarget,
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

	canExecute: (state) => getTextSlotCycleTarget(state) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, 1, registries.objectPartKind),
};
