import { useCallback, useMemo, useReducer, useRef } from "react";

import { historyReducer } from "./historyReducer";
import type { HistoryState } from "./HistoryTypes";
import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";

/**
 * 履歴管理を提供するカスタムフック
 */
export const useHistory = (initialDoc: CanvasDoc) => {
	const [history, dispatch] = useReducer(historyReducer, {
		past: [],
		present: initialDoc,
		future: [],
	} satisfies HistoryState);

	// Undo/Redo実行中フラグ（履歴記録をスキップするため）
	const isUndoRedoInProgressRef = useRef(false);

	/**
	 * 履歴に記録
	 * Undo/Redo実行中は自動的にスキップされる
	 */
	const record = useCallback((doc: CanvasDoc) => {
		// Undo/Redo実行中は記録しない
		if (isUndoRedoInProgressRef.current) {
			return;
		}
		dispatch({ type: "RECORD", doc });
	}, []);

	/**
	 * Undo実行
	 */
	const undo = useCallback(() => {
		isUndoRedoInProgressRef.current = true;
		dispatch({ type: "UNDO" });
		// 次のフレームでフラグをクリア
		requestAnimationFrame(() => {
			isUndoRedoInProgressRef.current = false;
		});
	}, []);

	/**
	 * Redo実行
	 */
	const redo = useCallback(() => {
		isUndoRedoInProgressRef.current = true;
		dispatch({ type: "REDO" });
		// 次のフレームでフラグをクリア
		requestAnimationFrame(() => {
			isUndoRedoInProgressRef.current = false;
		});
	}, []);

	/**
	 * 現在の状態を置き換え（外部更新用）
	 */
	const replace = useCallback((doc: CanvasDoc) => {
		dispatch({ type: "REPLACE", doc });
	}, []);

	/**
	 * 履歴をクリア
	 */
	const clear = useCallback(() => {
		dispatch({ type: "CLEAR" });
	}, []);

	/**
	 * Undoが可能かどうか
	 */
	const canUndo = useMemo(() => history.past.length > 0, [history.past.length]);

	/**
	 * Redoが可能かどうか
	 */
	const canRedo = useMemo(
		() => history.future.length > 0,
		[history.future.length],
	);

	return {
		history,
		record,
		undo,
		redo,
		replace,
		clear,
		canUndo,
		canRedo,
	};
};
