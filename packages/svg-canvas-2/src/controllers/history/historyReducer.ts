import type { HistoryAction, HistoryState } from "./HistoryTypes";

/**
 * 履歴スタックの最大サイズ
 */
const MAX_HISTORY_SIZE = 50;

/**
 * 履歴スタックを管理するReducer
 */
export const historyReducer = (
	state: HistoryState,
	action: HistoryAction,
): HistoryState => {
	switch (action.type) {
		case "RECORD": {
			// 現在の状態をpastに追加し、新しい状態をpresentにする
			// futureはクリア（新しい操作が行われたため）
			const newPast = [...state.past, state.present];

			// スタックサイズ制限: 50件を超えたら古いものから削除
			const trimmedPast =
				newPast.length > MAX_HISTORY_SIZE
					? newPast.slice(newPast.length - MAX_HISTORY_SIZE)
					: newPast;

			return {
				past: trimmedPast,
				present: action.doc,
				future: [], // 新しい操作が行われたのでRedoスタックをクリア
			};
		}

		case "UNDO": {
			// pastが空の場合は何もしない
			if (state.past.length === 0) {
				return state;
			}

			// pastから最後の状態を取り出してpresentにする
			// 現在のpresentはfutureに追加
			const previous = state.past[state.past.length - 1];
			const newPast = state.past.slice(0, -1);

			return {
				past: newPast,
				present: previous,
				future: [state.present, ...state.future],
			};
		}

		case "REDO": {
			// futureが空の場合は何もしない
			if (state.future.length === 0) {
				return state;
			}

			// futureから最初の状態を取り出してpresentにする
			// 現在のpresentはpastに追加
			const next = state.future[0];
			const newFuture = state.future.slice(1);

			return {
				past: [...state.past, state.present],
				present: next,
				future: newFuture,
			};
		}

		case "REPLACE": {
			// 外部更新時にpresentのみ置き換え
			// past/futureはそのまま維持
			return {
				...state,
				present: action.doc,
			};
		}

		case "CLEAR": {
			// 履歴を完全にクリア
			return {
				past: [],
				present: state.present,
				future: [],
			};
		}

		default:
			return state;
	}
};
