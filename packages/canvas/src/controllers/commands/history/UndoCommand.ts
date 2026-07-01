import { canvasToState } from "../../../states/canvas/CanvasMapper";
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

		const docToRestore = state.history.past[state.history.past.length - 1];
		const restoredState = canvasToState(docToRestore);

		return {
			...restoredState,
			viewport: state.viewport, // Preserve viewport
			selectedIds: [],
			eventStartSnapshot: null,
			keyPointsCache: {},
			snapCandidatesCache: null,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
			saveVersion: state.saveVersion + 1,
			saveNonce: crypto.randomUUID(),
			historyCoalesce: { recorded: null, pending: null }, // History navigation is a coalescing boundary
			contextMenuPosition: null,
			shapeLibraryDrag: null,
			areaSelection: null,
			objectMenuOpenId: null,
			multiSelectGroup: null,
			textEditState: null,
			pendingConnector: null,
			selectedConnectorId: null,
			selectedVertex: null,
			editingConnectorId: null,
			editingEndpoint: null,
			snapFeedback: null,
			axisLockFeedback: null,
			shapeDrawing: null,
			lastDuplicate: null,
			internalClipboard: state.internalClipboard,
			history: {
				past: state.history.past.slice(0, -1),
				present: docToRestore,
				future: [state.history.present, ...state.history.future],
			},
		};
	},
};
