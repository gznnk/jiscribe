import {
	canNavigateHistory,
	restoreHistorySnapshot,
} from "../../utils/restoreHistorySnapshot";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Undo command.
 * Shortcut: Ctrl/Cmd+Z
 * Restores the previous state from history.
 */
export const UndoCommand: ExecutableCommand = {
	id: "undo",
	label: "Undo",
	category: "edit",

	shortcuts: {
		mac: [{ code: "KeyZ", meta: true }],
		win: [{ code: "KeyZ", ctrl: true }],
		default: [{ code: "KeyZ", ctrl: true }],
	},

	canExecute: (state) =>
		canNavigateHistory(state) && state.history.past.length > 0,

	execute: (state, registries) => {
		const { past, present, future } = state.history;
		if (past.length === 0) {
			return state;
		}

		return restoreHistorySnapshot(
			state,
			{
				past: past.slice(0, -1),
				present: past[past.length - 1],
				future: [present, ...future],
			},
			registries,
		);
	},
};
