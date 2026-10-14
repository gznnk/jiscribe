import type { SelectionValue } from "./SelectionValue";
import { selectionValueOr } from "./SelectionValue";
import type { CoreStyleIntent, CoreStyleIntentKind } from "./StyleIntent";
import { isBoldFontWeight } from "../utils/isBoldFontWeight";
import {
	hasTextDecorationToken,
	toggleTextDecorationToken,
} from "../utils/toggleTextDecorationToken";

/** One of the formats a press or a keystroke turns on and off over the selected text. */
export type TextFormat = "bold" | "italic" | "underline" | "strikethrough";

/** Every format, in the order the surfaces lay them out. */
export const TEXT_FORMATS: readonly TextFormat[] = [
	"bold",
	"italic",
	"underline",
	"strikethrough",
];

/** The style intents a format is read from and written as. */
type TextFormatStyleIntentKind = Extract<
	CoreStyleIntentKind,
	"fontWeight" | "fontStyle" | "textDecoration"
>;

/** How one format sits on the field it is stored in. */
type TextFormatDefinition<K extends TextFormatStyleIntentKind> = {
	/** The field the format is read from and written to. */
	styleIntentKind: K;
	/** Whether a value of that field draws the format; undefined is the field unset. */
	isOn: (current: string | undefined) => boolean;
	/** The write that flips the format, given the value it is flipped from. */
	toggledIntent: (
		current: string | undefined,
	) => Extract<CoreStyleIntent, { kind: K }>;
};

/** Each format's definition; the union keeps an entry's kind and its intent the same field. */
const TEXT_FORMAT_DEFINITIONS: Record<
	TextFormat,
	{
		[K in TextFormatStyleIntentKind]: TextFormatDefinition<K>;
	}[TextFormatStyleIntentKind]
> = {
	bold: {
		styleIntentKind: "fontWeight",
		isOn: isBoldFontWeight,
		toggledIntent: (current) => ({
			kind: "fontWeight",
			weight: isBoldFontWeight(current) ? "normal" : "bold",
		}),
	},
	italic: {
		styleIntentKind: "fontStyle",
		isOn: (current) => current === "italic",
		toggledIntent: (current) => ({
			kind: "fontStyle",
			style: current === "italic" ? "normal" : "italic",
		}),
	},
	// The decorations share one field, so a flip takes the value and keeps the
	// other line rather than writing a boolean.
	underline: {
		styleIntentKind: "textDecoration",
		isOn: (current) => hasTextDecorationToken(current, "underline"),
		toggledIntent: (current) => ({
			kind: "textDecoration",
			decoration: toggleTextDecorationToken(current, "underline"),
		}),
	},
	strikethrough: {
		styleIntentKind: "textDecoration",
		isOn: (current) => hasTextDecorationToken(current, "line-through"),
		toggledIntent: (current) => ({
			kind: "textDecoration",
			decoration: toggleTextDecorationToken(current, "line-through"),
		}),
	},
};

/**
 * The style intent a format is stored as, for reading what the selection says
 * about it (readSelectionStyle / useSelectionStyle).
 *
 * @param format - The format; underline and strikethrough share `textDecoration`
 * @returns `fontWeight`, `fontStyle` or `textDecoration`
 */
export const textFormatStyleIntentKind = (
	format: TextFormat,
): TextFormatStyleIntentKind => TEXT_FORMAT_DEFINITIONS[format].styleIntentKind;

/**
 * Whether the selection is drawn with a format, which is what a format button
 * shows lit. A selection disagreeing about the field reads as off, so one press
 * brings all of it on ({@link toggleTextFormatIntent} reads it the same way).
 *
 * @param format - The format asked about
 * @param selectionValue - What the selection says about the format's field ({@link textFormatStyleIntentKind}); `none` reads as off
 */
export const isTextFormatOn = (
	format: TextFormat,
	selectionValue: SelectionValue<string | undefined>,
): boolean =>
	TEXT_FORMAT_DEFINITIONS[format].isOn(
		selectionValueOr(selectionValue, undefined),
	);

/**
 * The write that flips a format over the whole selection: off when every place
 * it reaches is drawn with it, on otherwise — so a mixed selection lands
 * uniformly on rather than flipping place by place.
 *
 * @param format - The format to flip
 * @param selectionValue - What the selection says about the format's field ({@link textFormatStyleIntentKind})
 * @returns An ordinary intent of that field carrying the value to land on; a decoration keeps the other line only when the selection agrees on it
 */
export const toggleTextFormatIntent = (
	format: TextFormat,
	selectionValue: SelectionValue<string | undefined>,
): CoreStyleIntent =>
	TEXT_FORMAT_DEFINITIONS[format].toggledIntent(
		selectionValueOr(selectionValue, undefined),
	);
