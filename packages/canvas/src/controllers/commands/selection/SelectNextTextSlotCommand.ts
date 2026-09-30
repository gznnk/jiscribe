import type { ExecutableCommand } from "../CommandTypes";
import {
	getTextSlotCycleTarget,
	selectAdjacentTextSlot,
} from "./utils/selectAdjacentTextSlot";

export const SelectNextTextSlotCommand: ExecutableCommand = {
	id: "selectNextTextSlot",
	label: { en: "Select Next Text Slot", ja: "次のテキストスロットを選択" },
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab" }],
	},

	canExecute: (state) => getTextSlotCycleTarget(state) !== null,

	execute: (state, registries) =>
		selectAdjacentTextSlot(state, 1, registries.objectPart),
};
