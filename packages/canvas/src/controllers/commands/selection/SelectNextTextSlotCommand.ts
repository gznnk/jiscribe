import type { ExecutableCommand } from "../CommandTypes";
import {
	getTextSlotCycleTarget,
	selectAdjacentTextSlot,
} from "./utils/selectAdjacentTextSlot";

export const SelectNextTextSlotCommand: ExecutableCommand = {
	id: "selectNextTextSlot",
	label: "Select Next Text Slot",
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab" }],
	},

	canExecute: (state) => getTextSlotCycleTarget(state) !== null,

	execute: (state) => selectAdjacentTextSlot(state, 1),
};
