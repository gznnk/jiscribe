import { TEXT_EMPHASIS_STYLE_KEYS } from "./RichText";
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
 * - 'slots': Named slots (keyed-form doc), each a TextSlot styled on its own;
 *   the slot set is closed and spelled out by the type.
 */
export type TextType = "body" | "source" | "slots";

/**
 * Whether the type holds its text as one body on the object itself rather than in
 * named slots — the two root-form docs, `"body"` and `"source"` alike. Every side
 * asking "is there a single text here to read, write or place" asks it through
 * this, so the two cannot drift apart on the question.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, which is a
 *   type holding no text at all, is false
 * @returns True for `"body"` and `"source"`, false for `"slots"` and `undefined`
 */
export const isSingleBodyText = (textType: TextType | undefined): boolean =>
	textType === "body" || textType === "source";

/**
 * The style fields a text of this type accepts, in the order
 * `TEXT_SLOT_STYLE_KEYS` declares them. The single answer every side that admits,
 * writes or reads a text style goes through, so what `setStyle` lets through
 * cannot drift from what a doc of the type may hold.
 *
 * A `"source"` text takes the whole set less the emphasis half
 * (`TEXT_EMPHASIS_STYLE_KEYS`): its body is written in a language whose own
 * syntax sets those, and a value set on both sides would leave the document
 * saying one thing and the drawing showing another.
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
	if (textType !== "source") {
		return [...TEXT_SLOT_STYLE_KEYS];
	}
	return TEXT_SLOT_STYLE_KEYS.filter(
		(key) => !(TEXT_EMPHASIS_STYLE_KEYS as readonly string[]).includes(key),
	);
};
