import type { ExecutableCommand } from "../CommandTypes";

/**
 * Opens the keyboard shortcut help modal.
 * Categorized as a view command on purpose: the modal lists the shortcut-bearing
 * commands of the registry, so `?` shows up in its own list.
 */
export const ShortcutHelpCommand: ExecutableCommand = {
	id: "shortcutHelp",
	label: "Keyboard Shortcuts",
	category: "view",
	shortcuts: {
		// Shift is implied by the character, so key-based bindings do not name it
		mac: [{ key: "?" }],
		win: [{ key: "?" }],
		default: [{ key: "?" }],
	},

	canExecute: () => true,

	execute: (state) =>
		state.activeModal === "shortcutHelp"
			? state
			: { ...state, activeModal: "shortcutHelp" },
};
