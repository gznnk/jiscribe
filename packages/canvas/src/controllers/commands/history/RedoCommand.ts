import {
	canNavigateHistory,
	restoreHistorySnapshot,
} from "../../utils/restoreHistorySnapshot";
import type { ExecutableCommand } from "../CommandTypes";

/**
 * Redo command.
 * Shortcut: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
 * Restores the next state from history.
 */
export const RedoCommand: ExecutableCommand = {
	id: "redo",
	label: "Redo",
	category: "edit",

	shortcuts: {
		mac: [
			{ code: "KeyZ", meta: true, shift: true },
			{ code: "KeyY", meta: true },
		],
		win: [
			{ code: "KeyZ", ctrl: true, shift: true },
			{ code: "KeyY", ctrl: true },
		],
		default: [
			{ code: "KeyZ", ctrl: true, shift: true },
			{ code: "KeyY", ctrl: true },
		],
	},

	canExecute: (state) =>
		canNavigateHistory(state) && state.history.future.length > 0,

	execute: (state, registries) => {
		const { past, present, future } = state.history;
		if (future.length === 0) {
			return state;
		}

		return restoreHistorySnapshot(
			state,
			{
				past: [...past, present],
				present: future[0],
				future: future.slice(1),
			},
			registries,
			// Redo crosses the same edge undo did, from the other side: the commit
			// being reapplied is the one that produced the entry being restored.
			future[0].changedIds,
		);
	},
};
