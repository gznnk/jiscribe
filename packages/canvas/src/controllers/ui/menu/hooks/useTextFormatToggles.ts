import { setAction } from "../../../gestures/handlers/menu/utils/menuActions";
import { useSelectionStyle } from "../../../style/SelectionStyleReaderContext";
import { selectionValueOr } from "../../../style/SelectionValue";
import { isBoldFontWeight } from "../../../utils/isBoldFontWeight";
import {
	hasTextDecorationToken,
	toggleTextDecorationToken,
} from "../../../utils/toggleTextDecorationToken";

/** One of the four format buttons, as either surface draws it. */
type TextFormatToggle = {
	/** Whether the selected text is drawn with the format, so the button reads lit. */
	isActive: boolean;
	/** The action the press writes: the value the toggle should land on, not a toggle command. */
	action: string;
};

/** The four formats, named; the surfaces decide the order and the look. */
type TextFormatToggles = {
	bold: TextFormatToggle;
	italic: TextFormatToggle;
	underline: TextFormatToggle;
	strikethrough: TextFormatToggle;
};

/**
 * Bold / italic / underline / strikethrough for the selected text: what each
 * one reads as, and what its press writes. The one place the four are decided,
 * so the ObjectMenu's row of buttons (TextFormatMenu) and the sidebar's Style
 * row (TextFormatItem) cannot disagree about what is lit or what a press does.
 *
 * Each button writes the value the press should land on rather than a toggle
 * command, so what it does is decided against what the text is actually drawn
 * with.
 *
 * @returns The four toggles by name
 */
export const useTextFormatToggles = (): TextFormatToggles => {
	// Each button is its own toggle, so mixing is read per field: a selection that
	// disagrees only about the weight still lights italic on the ones it agrees on.
	// A field it disagrees about reads as off, so one press brings all of it on.
	const fontWeight = selectionValueOr(
		useSelectionStyle("fontWeight"),
		undefined,
	);
	const fontStyle = selectionValueOr(useSelectionStyle("fontStyle"), undefined);
	const textDecoration = selectionValueOr(
		useSelectionStyle("textDecoration"),
		undefined,
	);
	const isBold = isBoldFontWeight(fontWeight);
	const isItalic = fontStyle === "italic";

	return {
		bold: {
			isActive: isBold,
			action: setAction("fontWeight", isBold ? "normal" : "bold"),
		},
		italic: {
			isActive: isItalic,
			action: setAction("fontStyle", isItalic ? "normal" : "italic"),
		},
		underline: {
			isActive: hasTextDecorationToken(textDecoration, "underline"),
			action: setAction(
				"textDecoration",
				toggleTextDecorationToken(textDecoration, "underline"),
			),
		},
		strikethrough: {
			isActive: hasTextDecorationToken(textDecoration, "line-through"),
			action: setAction(
				"textDecoration",
				toggleTextDecorationToken(textDecoration, "line-through"),
			),
		},
	};
};
