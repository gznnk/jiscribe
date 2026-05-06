import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { Command } from "../CommandTypes";

/**
 * Undo コマンド
 * ショートカット: Ctrl/Cmd+Z
 * 履歴から前の状態を復元する
 */
export const UndoCommand: Command = {
	id: "undo",
	label: "Undo",
	category: "edit",

	shortcuts: {
		mac: [{ key: "z", meta: true }],
		win: [{ key: "z", ctrl: true }],
		default: [{ key: "z", ctrl: true }],
	},

	canExecute: (state) => {
		// ドラッグ中、テキスト編集中は実行不可
		if (state.eventStartSnapshot !== null) return false;
		if (state.textEditState !== null) return false;
		// 履歴がない場合は実行不可
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
			edgeScrollEnabled: false,
			lastCommitTime: state.lastCommitTime, // Don't update - this is history restoration, not a new commit
			contextMenuPosition: null,
			pendingShapeType: null,
			ghostPosition: null,
			ghostShapeDimensions: null,
			areaSelection: null,
			objectMenuOpenId: null,
			multiSelectGroup: null,
			textEditState: null,
			pendingConnector: null,
			selectedConnectorId: null,
			editingConnectorId: null,
			editingEndpoint: null,
			snapFeedback: null,
			activeDrawingTool: null,
			drawingPreview: null,
			history: {
				past: state.history.past.slice(0, -1),
				present: docToRestore,
				future: [state.history.present, ...state.history.future],
			},
		};
	},
};
