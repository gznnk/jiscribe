import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { resolveDocSnapshot } from "../../../states/canvas/DocSnapshot";
import { resetUiState } from "../../utils/resetUiState";
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

	execute: (state, registries) => {
		if (state.history.past.length === 0) {
			return state;
		}

		// Resolve only the entry being restored; entries that merely move between
		// stacks stay as unresolved snapshots.
		const snapshotToRestore = state.history.past[state.history.past.length - 1];
		const mapper = registries.objectMapper;
		const restoredState = canvasToState(
			resolveDocSnapshot(snapshotToRestore, mapper),
			mapper,
			registries.objectContentResizer,
			state.docDefaults.fontFamily,
		);

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
			activeModal: state.activeModal, // History navigation must not close an open modal
			history: {
				past: state.history.past.slice(0, -1),
				present: snapshotToRestore,
				future: [state.history.present, ...state.history.future],
			},
		};
	},
};
