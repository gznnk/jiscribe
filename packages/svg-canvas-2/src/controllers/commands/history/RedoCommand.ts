import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { Command } from "../CommandTypes";

/**
 * Redo コマンド
 * ショートカット: Ctrl/Cmd+Shift+Z または Ctrl/Cmd+Y
 * 履歴から次の状態を復元する
 */
export const RedoCommand: Command = {
	id: "redo",
	label: "Redo",
	category: "edit",

	shortcuts: {
		mac: [
			{ key: "z", meta: true, shift: true },
			{ key: "y", meta: true },
		],
		win: [
			{ key: "z", ctrl: true, shift: true },
			{ key: "y", ctrl: true },
		],
		default: [
			{ key: "z", ctrl: true, shift: true },
			{ key: "y", ctrl: true },
		],
	},

	canExecute: (state) => {
		// ドラッグ中、テキスト編集中は実行不可
		if (state.eventStartSnapshot !== null) return false;
		if (state.textEditState !== null) return false;
		// 履歴がない場合は実行不可
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
			keyPointsCache: state.keyPointsCache,
			snapCandidatesCache: state.snapCandidatesCache,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
			saveVersion: state.saveVersion + 1,
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
			shapeDrawing: null,
			history: {
				past: [...state.history.past, state.history.present],
				present: docToRestore,
				future: state.history.future.slice(1),
			},
		};
	},
};
