import { TEXT_EMPHASIS_STYLE_KEYS } from "./TextEmphasisStyle";
import type { TextSlotStyle } from "./TextSlot";
import { TEXT_SLOT_STYLE_KEYS } from "./TextSlot";

/**
 * How a type holds its text — the value of `ObjectFeatures.text`, which a type
 * holding no text leaves out. Not the kinds of the `text` object, which are its
 * layouts (TextLayout).
 * - 'body': One body on the object itself (root-form doc, TextStyleDoc). The
 *   body may be styled in runs and takes the slot's whole typography.
 * - 'source': The same single body, written in a language the shape renders
 *   itself (SourceTextStyleDoc). A plain string only, and no emphasis
 *   typography, both being what the language's own syntax carries.
 * - 'label': The same single body as 'body', hung below the box as a caption
 *   sized from its own text (LabelTextStyleDoc) rather than laid out inside the
 *   box. Every such type places it the same way (calcLabelTextRegion), so a type
 *   declares no region of its own, and the body takes no `verticalAlign`, having
 *   no room in its box to move through.
 * - 'slots': Named slots (keyed-form doc), each a TextSlot styled on its own;
 *   the slot set is closed and spelled out by the type.
 */
export type TextType = "body" | "source" | "label" | "slots";

/**
 * Whether the type holds its text as one body on the object itself rather than in
 * named slots — the root-form docs, `"body"`, `"source"` and `"label"` alike. Every side
 * asking "is there a single text here to read, write or place" asks it through
 * this, so the two cannot drift apart on the question.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"body"`, `"source"` and `"label"`, false for `"slots"` and `undefined`
 */
export const isSingleBodyText = (textType: TextType | undefined): boolean =>
	textType === "body" || textType === "source" || textType === "label";

/**
 * The style fields a text of this type accepts, in the order
 * `TEXT_SLOT_STYLE_KEYS` declares them. The single answer every side that admits,
 * writes or reads a text style goes through, so what `setStyle` lets through
 * cannot drift from what a doc of the type may hold.
 *
 * A `"source"` text takes the whole set less the emphasis half
 * (`TEXT_EMPHASIS_STYLE_KEYS`): its body is written in a language whose own
 * syntax sets those, and a value set on both sides would leave the document
 * saying one thing and the drawing showing another. A `"label"` text takes the
 * whole set less `verticalAlign`: its box is sized from the text, so there is no
 * slack for the block to be placed in.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, yields an empty array
 * @returns The accepted field names, a fresh array the caller may keep
 */
export const textStyleKeysOf = (
	textType: TextType | undefined,
): (keyof TextSlotStyle)[] => {
	if (textType === undefined) {
		return [];
	}
	if (textType === "label") {
		return TEXT_SLOT_STYLE_KEYS.filter((key) => key !== "verticalAlign");
	}
	if (textType !== "source") {
		return [...TEXT_SLOT_STYLE_KEYS];
	}
	return TEXT_SLOT_STYLE_KEYS.filter(
		(key) => !(TEXT_EMPHASIS_STYLE_KEYS as readonly string[]).includes(key),
	);
};

/**
 * Whether a text of this type takes any of the emphasis fields — bold, italic and
 * the decoration lines (`TEXT_EMPHASIS_STYLE_KEYS`). The emphasis half is all or
 * nothing: the base fields and the alignment are taken by every text type, so
 * this is the only axis on which the types differ in what they may be styled with.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"body"`, `"label"` and `"slots"`, false for `"source"` and `undefined`
 */
export const acceptsTextEmphasisStyle = (
	textType: TextType | undefined,
): boolean => {
	const accepted = textStyleKeysOf(textType) as readonly string[];
	return TEXT_EMPHASIS_STYLE_KEYS.some((key) => accepted.includes(key));
};
