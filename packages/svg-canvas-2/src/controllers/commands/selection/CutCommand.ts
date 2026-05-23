import { CopyCommand } from "./CopyCommand";
import { DeleteCommand } from "./DeleteCommand";
import type { Command } from "../CommandTypes";

export const CutCommand: Command = {
	id: "cut",
	label: "Cut",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyX", meta: true }],
		win: [{ code: "KeyX", ctrl: true }],
		default: [{ code: "KeyX", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		CopyCommand.execute(state);
		return DeleteCommand.execute(state);
	},
};
