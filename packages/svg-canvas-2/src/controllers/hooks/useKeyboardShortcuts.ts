import { useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { commandRegistry } from "../commands/CommandRegistry";

/**
 * キーボードショートカットを処理するカスタムフック
 *
 * @param onUndo 提供時、Ctrl+Z を Canvas 内部の UndoCommand ではなくこのコールバックで処理する
 * @param onRedo 提供時、Ctrl+Shift+Z / Ctrl+Y を Canvas 内部の RedoCommand ではなくこのコールバックで処理する
 */
export const useKeyboardShortcuts = (
	canvasState: CanvasControllerState,
	handleCommand: (commandId: string) => void,
	onUndo?: () => void,
	onRedo?: () => void,
) => {
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
				handleCommand(command.id);
			}
		};

		// document にイベントリスナーを登録（グローバルショートカット）
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleCommand, onUndo, onRedo]);
};
