import type { SelectionValue } from "./SelectionValue";
import { selectionValueOr } from "./SelectionValue";
import type {
	CoreStyleIntent,
	CoreStyleIntentKind,
	StyleIntentValueType,
} from "./StyleIntent";
import { isBoldFontWeight } from "../utils/isBoldFontWeight";

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
	"fontWeight" | "fontStyle" | "underline" | "strikethrough"
>;

/** What any format's intent reads as: a weight or a style (unset included), or whether a line is on. */
type TextFormatValue = StyleIntentValueType<TextFormatStyleIntentKind>;

/** How one format sits on the intent it is read and written through. */
type TextFormatDefinition<K extends TextFormatStyleIntentKind> = {
	/** The intent the format is read from and written as. */
	styleIntentKind: K;
	/** Whether a value the selection agrees on draws the format; undefined is no agreed value. */
	isOn: (current: StyleIntentValueType<K> | undefined) => boolean;
	/** The write that brings the format on (`on: true`) or off. */
	intentOf: (on: boolean) => Extract<CoreStyleIntent, { kind: K }>;
};

/** Each format's definition; the union keeps an entry's kind and its intent the same. */
const TEXT_FORMAT_DEFINITIONS: Record<
	TextFormat,
	{
		[K in TextFormatStyleIntentKind]: TextFormatDefinition<K>;
	}[TextFormatStyleIntentKind]
> = {
	bold: {
		styleIntentKind: "fontWeight",
		isOn: isBoldFontWeight,
		intentOf: (on) => ({ kind: "fontWeight", weight: on ? "bold" : "normal" }),
	},
	italic: {
		styleIntentKind: "fontStyle",
		isOn: (current) => current === "italic",
		intentOf: (on) => ({ kind: "fontStyle", style: on ? "italic" : "normal" }),
	},
	// The decorations share one field, so each line is read and written through
	// an intent of its own that every place resolves against the other line it
	// carries (textDecorationLineEntry), rather than through `textDecoration`.
	underline: {
		styleIntentKind: "underline",
		isOn: (current) => current === true,
		intentOf: (on) => ({ kind: "underline", on }),
	},
	strikethrough: {
		styleIntentKind: "strikethrough",
		isOn: (current) => current === true,
		intentOf: (on) => ({ kind: "strikethrough", on }),
	},
};

/**
 * The style intent a format is stored as, for reading what the selection says
 * about it (readSelectionStyle / useSelectionStyle).
 *
 * @param format - The format asked about
 * @returns `fontWeight`, `fontStyle`, `underline` or `strikethrough`; the last two read whether each place the selection reaches carries that line
 */
export const textFormatStyleIntentKind = (
	format: TextFormat,
): TextFormatStyleIntentKind => TEXT_FORMAT_DEFINITIONS[format].styleIntentKind;

/**
 * Whether the selection is drawn with a format, which is what a format button
 * shows lit. A selection disagreeing about it reads as off, so one press brings
 * all of it on ({@link toggleTextFormatIntent} reads it the same way). A line is
 * read per place, so text that is all underlined lights the underline whatever
 * strikethrough each part carries.
 *
 * @param format - The format asked about
 * @param selectionValue - What the selection says about the format's intent ({@link textFormatStyleIntentKind}); `none` reads as off
 */
export const isTextFormatOn = (
	format: TextFormat,
	selectionValue: SelectionValue<TextFormatValue>,
): boolean =>
	// The definition is chosen by `format` at runtime, so its value type cannot
	// be tied to the selection's statically; each isOn reads only its own kind.
	(TEXT_FORMAT_DEFINITIONS[format].isOn as (current: unknown) => boolean)(
		selectionValueOr(selectionValue, undefined),
	);

/**
 * The write that flips a format over the whole selection: off when every place
 * it reaches is drawn with it, on otherwise — so a mixed selection lands
 * uniformly on rather than flipping place by place.
 *
 * @param format - The format to flip
 * @param selectionValue - What the selection says about the format's intent ({@link textFormatStyleIntentKind})
 * @returns The intent of {@link textFormatStyleIntentKind}: a weight or a style to land on, or a line to put on or take off each place while it keeps its other line
 */
export const toggleTextFormatIntent = (
	format: TextFormat,
	selectionValue: SelectionValue<TextFormatValue>,
): CoreStyleIntent =>
	TEXT_FORMAT_DEFINITIONS[format].intentOf(
		!isTextFormatOn(format, selectionValue),
	);
