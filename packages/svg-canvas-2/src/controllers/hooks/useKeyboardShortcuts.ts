import { useEffect, useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";
import { commandRegistry } from "../commands/CommandRegistry";

/**
 * キーボードショートカットを処理するカスタムフック
 */
export const useKeyboardShortcuts = (
	canvasState: CanvasControllerState,
	handleCommand: (commandId: string) => void,
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
			if (command && command.canExecute(canvasStateRef.current)) {
				handleCommand(command.id);
				event.preventDefault();
				event.stopPropagation();
			}
		};

		// document にイベントリスナーを登録（グローバルショートカット）
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleCommand]);
};
