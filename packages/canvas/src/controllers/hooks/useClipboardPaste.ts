import { type Dispatch, useCallback, useEffect } from "react";

import { getPlatform } from "../commands/CommandUtils";
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
			// ペースト対象が無くても、メニュー経由のクリックならメニューは閉じる。
			// PASTE は dispatch されないため、ここで明示的に閉じないと開いたままになる。
			dispatch({ type: "CLOSE_CONTEXT_MENU" });
			return;
		}
		dispatch({ type: "PASTE", data });
	}, [dispatch, internalClipboard]);

	// Ctrl+V / Cmd+V でペースト
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				e.target instanceof HTMLSelectElement
			) {
				return;
			}
			const isMac = getPlatform() === "mac";
			if (
				e.code === "KeyV" &&
				(isMac ? e.metaKey : e.ctrlKey) &&
				!e.shiftKey &&
				!e.altKey
			) {
				void handlePaste();
				e.preventDefault();
				e.stopPropagation();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [handlePaste]);

	return handlePaste;
};
