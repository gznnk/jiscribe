import type { TextFormat } from "../../style/TextFormat";
import {
	TEXT_FORMATS,
	textFormatStyleIntentKind,
	toggleTextFormatIntent,
} from "../../style/TextFormat";
import { applyStyleIntent } from "../../style/walk/applyStyleIntent";
import { readSelectionStyle } from "../../style/walk/readSelectionStyle";
import type {
	ExecutableCommand,
	KeyBinding,
	PlatformKeyBindings,
} from "../CommandTypes";
import { getPlatformShortcuts, matchesKeyBinding } from "../CommandUtils";

/** What sets one format's command apart from the others. */
type ToggleTextFormatCommandSpec = {
	id: string;
	label: { en: string; ja: string };
	/** The key pressed with Ctrl (Cmd on a Mac), Shift included where it is part of the binding. */
	binding: Pick<KeyBinding, "code" | "shift">;
};

const TOGGLE_TEXT_FORMAT_COMMAND_SPECS: Record<
	TextFormat,
	ToggleTextFormatCommandSpec
> = {
	bold: {
		id: "toggleBold",
		label: { en: "Bold", ja: "太字" },
		binding: { code: "KeyB" },
	},
	italic: {
		id: "toggleItalic",
		label: { en: "Italic", ja: "斜体" },
		binding: { code: "KeyI" },
	},
	underline: {
		id: "toggleUnderline",
		label: { en: "Underline", ja: "下線" },
		binding: { code: "KeyU" },
	},
	// Shift keeps it apart from Cut's Ctrl/Cmd+X.
	strikethrough: {
		id: "toggleStrikethrough",
		label: { en: "Strikethrough", ja: "取り消し線" },
		binding: { code: "KeyX", shift: true },
	},
};

/** One format's binding held with Cmd on a Mac and Ctrl elsewhere. */
const shortcutsOf = (format: TextFormat): PlatformKeyBindings => {
	const { binding } = TOGGLE_TEXT_FORMAT_COMMAND_SPECS[format];
	return {
		mac: [{ ...binding, meta: true }],
		win: [{ ...binding, ctrl: true }],
		default: [{ ...binding, ctrl: true }],
	};
};

/**
 * Turns one format on or off over everything the selection reaches: the selected
 * shapes' text, the picked slot, or the stretch an open editor has selected —
 * with an editor open but nothing selected in it, the whole slot it edits.
 *
 * The selection is read as one (readSelectionStyle) and the format comes out
 * uniformly on or off (toggleTextFormatIntent), so a selection mixing it comes
 * out all on and the press after that takes it off everywhere — a decoration
 * line leaving each place's other line as it was; one commit, one history entry.
 */
const createToggleTextFormatCommand = (
	format: TextFormat,
): ExecutableCommand => {
	const { id, label } = TOGGLE_TEXT_FORMAT_COMMAND_SPECS[format];
	const styleIntentKind = textFormatStyleIntentKind(format);
	return {
		id,
		label,
		category: "edit",
		shortcuts: shortcutsOf(format),

		canExecute: (state, registries) =>
			readSelectionStyle(state, styleIntentKind, registries).kind !== "none",

		execute: (state, registries) => {
			const intent = toggleTextFormatIntent(
				format,
				readSelectionStyle(state, styleIntentKind, registries),
			);
			const styled = applyStyleIntent(state, intent, registries);
			if (styled === state) {
				return state;
			}
			return { ...styled, commitVersion: state.commitVersion + 1 };
		},
	};
};

/** The four format commands, in TEXT_FORMATS order. */
export const toggleTextFormatCommands: readonly ExecutableCommand[] =
	TEXT_FORMATS.map(createToggleTextFormatCommand);

/**
 * The id of the command that flips a format, for a surface that raises it
 * without going through the canvas's shortcut handling (a format button, the
 * text editor's keystrokes).
 *
 * @param format - The format to flip
 * @returns `toggleBold` / `toggleItalic` / `toggleUnderline` / `toggleStrikethrough`
 */
export const toggleTextFormatCommandId = (format: TextFormat): string =>
	TOGGLE_TEXT_FORMAT_COMMAND_SPECS[format].id;

/**
 * The format a keystroke flips, matched against the format commands' own
 * shortcuts — for the text editor, whose keystrokes never reach the canvas's
 * shortcut handling (useKeyboardShortcuts skips an editable target) and which
 * has to cancel the browser's own formatting for them.
 *
 * @param event - The keydown, as the editor's surface received it
 * @returns The format, or undefined for a keystroke none of them is bound to on this platform
 */
export const findTextFormatByShortcut = (
	event: Pick<
		KeyboardEvent,
		"code" | "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey"
	>,
): TextFormat | undefined =>
	TEXT_FORMATS.find((format) =>
		getPlatformShortcuts(shortcutsOf(format)).some((binding) =>
			matchesKeyBinding(binding, event),
		),
	);
