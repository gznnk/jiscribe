import { toggleTextFormatCommandId } from "../../../commands/text/ToggleTextFormatCommands";
import { commandAction } from "../../../gestures/handlers/menu/utils/menuActions";
import type { TextFormat } from "../../../style/TextFormat";
import {
	isTextFormatOn,
	textFormatStyleIntentKind,
} from "../../../style/TextFormat";
import { useSelectionStyle } from "../SelectionStyleReaderContext";

/** One of the four format buttons, as a surface draws it. */
type TextFormatToggle = {
	/** Whether the selected text is drawn with the format, so the button reads lit. */
	isActive: boolean;
	/** The action the press writes: the format's command, which decides the value to land on itself. */
	action: string;
};

/** The four formats, named; the surfaces decide the order and the look. */
type TextFormatToggles = Record<TextFormat, TextFormatToggle>;

/** One format's button: lit by the intent it is read through, pressing its command. */
const useTextFormatToggle = (format: TextFormat): TextFormatToggle => ({
	isActive: isTextFormatOn(
		format,
		useSelectionStyle(textFormatStyleIntentKind(format)),
	),
	action: commandAction(toggleTextFormatCommandId(format)),
});

/**
 * Bold / italic / underline / strikethrough for the selected text: what each
 * one reads as, and what its press runs. The one place the four are decided,
 * so the ObjectMenu's Bold toggle (TextFormatMenu) and the sidebar's Style row
 * (TextFormatItem) cannot disagree about what is lit or what a press does.
 *
 * A press runs the format's command (ToggleTextFormatCommands) — the one the
 * keyboard runs too — and the button lights by the same reading the command
 * flips from (isTextFormatOn). Mixing is read per format, so a selection that
 * disagrees only about the weight still lights italic where it agrees on it, and
 * one disagreeing only about the strikethrough still lights the underline.
 *
 * @returns The four toggles by name
 */
export const useTextFormatToggles = (): TextFormatToggles => ({
	bold: useTextFormatToggle("bold"),
	italic: useTextFormatToggle("italic"),
	underline: useTextFormatToggle("underline"),
	strikethrough: useTextFormatToggle("strikethrough"),
});
