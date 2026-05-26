import { useEffect } from "react";

import { getPlatform } from "../commands/CommandUtils";

export const usePasteKeyboardShortcut = (onPaste: () => void): void => {
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
				onPaste();
				e.preventDefault();
				e.stopPropagation();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onPaste]);
};
