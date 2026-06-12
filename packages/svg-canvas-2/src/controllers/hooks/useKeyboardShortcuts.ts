import { type Dispatch, useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { commandRegistry } from "../commands/CommandRegistry";
import type { CanvasAction } from "../reducer/CanvasActions";

export type UseKeyboardShortcutsParams = {
	canvasState: CanvasControllerState;
	/** Canvas reducer の dispatch（実行可能なコマンドを COMMAND アクションとして送る） */
	dispatch: Dispatch<CanvasAction>;
	/** 提供時、Ctrl+Z を Canvas 内部の UndoCommand ではなくこのコールバックで処理する */
	onUndo?: () => void;
	/** 提供時、Ctrl+Shift+Z / Ctrl+Y を Canvas 内部の RedoCommand ではなくこのコールバックで処理する */
	onRedo?: () => void;
};

/**
 * キーボードショートカットを処理するカスタムフック
 */
export const useKeyboardShortcuts = ({
	canvasState,
	dispatch,
	onUndo,
	onRedo,
}: UseKeyboardShortcutsParams): void => {
	const canvasStateRef = useRef(canvasState);
	canvasStateRef.current = canvasState;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// 入力フィールドなどでは無効化
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement
			) {
				return;
			}

			const command = commandRegistry.findByShortcut(event);
			if (!command) {
				return;
			}

			// バインディングが存在する場合はブラウザデフォルト動作を常に止める
			event.preventDefault();
			event.stopPropagation();

			// undo/redo は外部コールバックが提供されている場合、canExecute を確認せず委譲する
			// （利用可否は VSCode など外部の管理者が判断するため）
			if (command.id === "undo" && onUndo) {
				onUndo();
				return;
			}
			if (command.id === "redo" && onRedo) {
				onRedo();
				return;
			}
			if (command.canExecute(canvasStateRef.current)) {
				dispatch({ type: "COMMAND", commandId: command.id });
			}
		};

		// document にイベントリスナーを登録（グローバルショートカット）
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [dispatch, onUndo, onRedo]);
};
