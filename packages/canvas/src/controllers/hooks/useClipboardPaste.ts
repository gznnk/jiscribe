import { type Dispatch, useCallback, useEffect } from "react";

import { getPlatform } from "../commands/CommandUtils";
import {
	type ClipboardData,
	isClipboardData,
} from "../commands/selection/ClipboardData";
import type { CanvasAction } from "../reducer/CanvasActions";

/**
 * Custom hook that builds the paste handler and registers it to the keyboard
 * shortcut (Ctrl+V / Cmd+V).
 *
 * It tries to read the OS clipboard and falls back to internalClipboard on failure.
 *
 * @param internalClipboard - Fallback used when the OS clipboard cannot be read
 * @param dispatch - Canvas reducer dispatch
 * @returns The paste handler callback (reusable from the context menu and elsewhere)
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
			// Even when there is nothing to paste, close the menu if this came from a
			// menu click. PASTE is not dispatched, so without explicitly closing here
			// the menu would stay open.
			dispatch({ type: "CLOSE_CONTEXT_MENU" });
			return;
		}
		dispatch({ type: "PASTE", data });
	}, [dispatch, internalClipboard]);

	// Paste with Ctrl+V / Cmd+V
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
