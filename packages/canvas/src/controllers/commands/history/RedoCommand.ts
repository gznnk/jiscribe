import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { Command } from "../CommandTypes";

/**
 * Redo command.
 * Shortcut: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
 * Restores the next state from history.
 */
export const RedoCommand: Command = {
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

	execute: (state) => {
		if (state.history.future.length === 0) {
			return state;
		}

		const docToRestore = state.history.future[0];
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
				past: [...state.history.past, state.history.present],
				present: docToRestore,
				future: state.history.future.slice(1),
			},
		};
	},
};
