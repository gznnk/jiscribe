import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { resolveDocSnapshot } from "../../../states/canvas/DocSnapshot";
import { resetUiState } from "../../utils/resetUiState";
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

	canExecute: (state) => {
		// Not executable while dragging or editing text
		if (state.eventStartSnapshot !== null) {
			return false;
		}
		if (state.textEditState !== null) {
			return false;
		}
		// Not executable when there is no history
		return state.history.future.length > 0;
	},

	execute: (state, registries) => {
		if (state.history.future.length === 0) {
			return state;
		}

		// Resolve only the entry being restored; entries that merely move between
		// stacks stay as unresolved snapshots.
		const snapshotToRestore = state.history.future[0];
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
			// Restoring different objects moves the wall; limitViewScroll notices the
			// swapped objects and re-measures on the next view scroll.
			scrollLimit: state.scrollLimit,
			commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
			saveVersion: state.saveVersion + 1,
			saveNonce: crypto.randomUUID(),
			historyCoalesce: { recorded: null, pending: null }, // History navigation is a coalescing boundary
			docDefaults: state.docDefaults,
			internalClipboard: state.internalClipboard,
			activeModal: state.activeModal, // History navigation must not close an open modal
			history: {
				past: [...state.history.past, state.history.present],
				present: snapshotToRestore,
				future: state.history.future.slice(1),
			},
		};
	},
};
