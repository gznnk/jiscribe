import { type Dispatch, useCallback } from "react";

import { usePasteKeyboardShortcut } from "./usePasteKeyboardShortcut";
import {
	type ClipboardData,
	isClipboardData,
} from "../commands/selection/ClipboardData";
import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * ペースト処理を組み立て、キーボードショートカット（Ctrl+V / Cmd+V）に登録するカスタムフック
 *
 * OS クリップボードの読み取りを試み、失敗時は internalClipboard にフォールバックする。
 *
 * @param internalClipboard - OS クリップボードが読めない場合のフォールバック
 * @param dispatch - Canvas reducer の dispatch
 * @returns ペースト処理コールバック（コンテキストメニューなどから再利用できる）
 */
export const useClipboardPaste = (
	internalClipboard: ClipboardData | null,
	dispatch: Dispatch<CanvasAction>,
): (() => Promise<void>) => {
	const handlePaste = useCallback(async () => {
		let data = null;
		try {
			const text = await navigator.clipboard.readText();
			const parsed: unknown = JSON.parse(text);
			if (isClipboardData(parsed)) {
				data = parsed;
			}
		} catch {
			// clipboard read failure or parse error
		}
		data ??= internalClipboard;
		if (!data) {
			return;
		}
		dispatch({ type: "PASTE", data });
	}, [dispatch, internalClipboard]);

	usePasteKeyboardShortcut(handlePaste);

	return handlePaste;
};
