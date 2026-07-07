import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { resolveDocSnapshot } from "../../../states/canvas/DocSnapshot";
import { resetUiState } from "../../utils/resetUiState";
import type { Command } from "../CommandTypes";

/**
 * Undo command.
 * Shortcut: Ctrl/Cmd+Z
 * Restores the previous state from history.
 */
export const UndoCommand: Command = {
	id: "undo",
	label: "Undo",
	category: "edit",

	shortcuts: {
		mac: [{ code: "KeyZ", meta: true }],
		win: [{ code: "KeyZ", ctrl: true }],
		default: [{ code: "KeyZ", ctrl: true }],
	},

	canExecute: (state) => {
		// Not executable while dragging or editing text
		if (state.eventStartSnapshot !== null) {
			return false;
		}
		if (state.textEditState !== null) {
			return false;
		}
		// Not executable when there is no history
		return state.history.past.length > 0;
	},

	execute: (state) => {
		if (state.history.past.length === 0) {
			return state;
		}

		// Resolve only the entry being restored; entries that merely move between
		// stacks stay as unresolved snapshots.
		const snapshotToRestore = state.history.past[state.history.past.length - 1];
		const restoredState = canvasToState(resolveDocSnapshot(snapshotToRestore));

		return {
			...restoredState,
			...resetUiState(),
			viewport: state.viewport, // Preserve viewport
			commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
			saveVersion: state.saveVersion + 1,
			saveNonce: crypto.randomUUID(),
			historyCoalesce: { recorded: null, pending: null }, // History navigation is a coalescing boundary
			docDefaults: state.docDefaults,
			internalClipboard: state.internalClipboard,
			history: {
				past: state.history.past.slice(0, -1),
				present: snapshotToRestore,
				future: [state.history.present, ...state.history.future],
			},
		};
	},
};
