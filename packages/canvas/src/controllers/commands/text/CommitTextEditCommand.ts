import { commitTextEditIfNeeded } from "../../utils/commitTextEditIfNeeded";
import type { ExecutableCommand, PlatformKeyBindings } from "../CommandTypes";
import { getPlatformShortcuts, matchesKeyBinding } from "../CommandUtils";

/** Cmd+Enter on a Mac, Ctrl+Enter elsewhere; plain Enter stays a newline in the editor. */
const COMMIT_TEXT_EDIT_SHORTCUTS: PlatformKeyBindings = {
	mac: [{ code: "Enter", meta: true }],
	win: [{ code: "Enter", ctrl: true }],
	default: [{ code: "Enter", ctrl: true }],
};

/**
 * Commits the open text edit — a shape's slot or a connector's label — and
 * closes the editor, as a press outside it does (END_TEXT_EDIT with `commit`).
 *
 * Only the write-back happens here: the COMMAND route settles what it moved
 * (content sizes, connector vertices, the selection) and records the history
 * the same way END_TEXT_EDIT's commit tail does, so either way ends in one and
 * the same undo entry.
 */
export const CommitTextEditCommand: ExecutableCommand = {
	id: "commitTextEdit",
	label: { en: "Commit Text Editing", ja: "テキスト編集を確定" },
	category: "edit",
	shortcuts: COMMIT_TEXT_EDIT_SHORTCUTS,

	canExecute: (state) => state.mode.kind === "textEdit",

	execute: (state) => commitTextEditIfNeeded(state),
};

/**
 * Whether a keystroke is the one that commits the open text edit, matched
 * against the command's own shortcuts — for the editors, whose keystrokes never
 * reach the canvas's shortcut handling (useKeyboardShortcuts skips an editable
 * target).
 *
 * @param event - The keydown, as the editor's surface received it; an IME
 *   composition is not looked at here, so the editor has to rule that out itself
 * @returns True for Cmd+Enter on a Mac and Ctrl+Enter elsewhere (getPlatform)
 */
export const isCommitTextEditShortcut = (
	event: Pick<
		KeyboardEvent,
		"code" | "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey"
	>,
): boolean =>
	getPlatformShortcuts(COMMIT_TEXT_EDIT_SHORTCUTS).some((binding) =>
		matchesKeyBinding(binding, event),
	);
