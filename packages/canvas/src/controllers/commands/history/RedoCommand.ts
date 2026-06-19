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
		// ドラッグ中、テキスト編集中は実行不可
		if (state.eventStartSnapshot !== null) {
			return false;
		}
		if (state.textEditState !== null) {
			return false;
		}
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
			keyPointsCache: {},
			snapCandidatesCache: null,
			edgeScrollEnabled: false,
			commitVersion: state.commitVersion, // Don't update - this is history restoration, not a new commit
			saveVersion: state.saveVersion + 1,
			saveNonce: crypto.randomUUID(),
			historyCoalesce: { recorded: null, pending: null }, // 履歴ナビゲーションは集約境界
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
