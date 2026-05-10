import { CopyCommand } from "./CopyCommand";
import { DeleteCommand } from "./DeleteCommand";
import type { Command } from "../CommandTypes";

export const CutCommand: Command = {
	id: "cut",
	label: "Cut",
	category: "edit",
	shortcuts: {
		mac: [{ key: "x", meta: true }],
		win: [{ key: "x", ctrl: true }],
		default: [{ key: "x", ctrl: true }],
	},

	canExecute: (state) => state.selectedIds.length > 0,

	execute: (state) => {
		CopyCommand.execute(state);
		return DeleteCommand.execute(state);
	},
};
