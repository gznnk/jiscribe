import type { Command } from "../CommandTypes";

/**
 * Definition-only command for paste: registers the shortcut / label / category
 * so shortcut matching, the help modal, and conflict checks all see paste,
 * while execution stays a callback (async clipboard read cannot be a pure
 * state transition — see useClipboardPaste).
 */
export const PasteCommand: Command = {
	id: "paste",
	label: "Paste",
	category: "edit",
	shortcuts: {
		mac: [{ code: "KeyV", meta: true }],
		win: [{ code: "KeyV", ctrl: true }],
		default: [{ code: "KeyV", ctrl: true }],
	},

	// Paste availability cannot be known synchronously (the OS clipboard is
	// read async at execution time), so the shortcut is always considered active.
	canExecute: () => true,
};
