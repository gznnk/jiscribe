import type { ExecutableCommand } from "../CommandTypes";
import {
	getTextSlotCycleTarget,
	selectAdjacentTextSlot,
} from "./utils/selectAdjacentTextSlot";

export const SelectPreviousTextSlotCommand: ExecutableCommand = {
	id: "selectPreviousTextSlot",
	label: "Select Previous Text Slot",
	category: "selection",
	shortcuts: {
		default: [{ code: "Tab", shift: true }],
	},

	canExecute: (state) => getTextSlotCycleTarget(state) !== null,

	execute: (state) => selectAdjacentTextSlot(state, -1),
};
