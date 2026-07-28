import { BODY_TEXT_SLOT_ID } from "../../../constants/textSlotId";
import type { TextStyleDoc } from "../../../schemas/objects/base/TextStyleDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { TextSlot } from "../../../schemas/objects/types/TextSlot";
import { TEXT_SLOT_STYLE_KEYS } from "../../../schemas/objects/types/TextSlot";
import { isTextSlots, readTextSlot, type TextSlots } from "../types/TextSlots";

/**
 * The doc fields the text group occupies, in either shape: the flat TextStyleDoc
 * for a single-body type, the keyed slots for a type that spells them out.
 */
export type TextDocFields = Omit<TextStyleDoc, "text"> & {
	text?: string | TextSlots;
};

/** Copies the styling fields that are actually set, so a slot gains no `undefined`-valued keys. */
const pickDefinedStyle = (
	source: Omit<TextSlot, "text">,
): Omit<TextSlot, "text"> => {
	const style: Record<string, unknown> = {};
	for (const key of TEXT_SLOT_STYLE_KEYS) {
		const value = source[key];
		if (value !== undefined) {
			style[key] = value;
		}
	}
	return style;
};

/**
 * Expands a doc's text group into the state normal form (keyed slots).
 *
 * A `"body"` type's flat doc becomes the single `body` slot, its root styling
 * moving into that slot; the slot is materialized even when the doc carries
 * neither text nor styling, because a text-bearing shape always has a slot to
 * edit, which is what makes the key set the authority on slots. A `"slots"` type
 * is already in the normal form and passes through — its closed key set is the
 * type's own mapper to guarantee (see the record shape).
 *
 * @param textShape - The type's `features.text`; undefined yields no `text` key at all
 * @param doc - The doc being converted; only its text group is read
 * @returns `{}` for a text-less type, otherwise `{ text }` with a fresh slot map
 */
export const mapTextDocToState = (
	textShape: ObjectFeatures["text"],
	doc: TextDocFields,
): { text?: TextSlots } => {
	if (textShape === "body") {
		const content = typeof doc.text === "string" ? doc.text : "";
		return {
			text: {
				[BODY_TEXT_SLOT_ID]: { text: content, ...pickDefinedStyle(doc) },
			},
		};
	}
	if (textShape === "slots") {
		return { text: isTextSlots(doc.text) ? { ...doc.text } : {} };
	}
	return {};
};

/**
 * Folds the state's slots back into the doc's text group, as a partial doc so
 * that an absent value contributes no key at all.
 *
 * A `"body"` type flattens its one slot: an empty content and unset styling each
 * drop out, which is exactly what an absent doc field expands back to, making
 * doc → state → doc the identity. A `"slots"` type is emitted unchanged.
 *
 * @param textShape - The type's `features.text`; undefined yields no fields at all
 * @param text - The state's slots; undefined for a shape that holds no text
 * @returns The text group's doc fields, each key present only when it has a value
 */
export const mapTextStateToDoc = (
	textShape: ObjectFeatures["text"],
	text: TextSlots | undefined,
): TextDocFields => {
	if (textShape === "body") {
		const content = readTextSlot(text, BODY_TEXT_SLOT_ID);
		const slot = text?.[BODY_TEXT_SLOT_ID];
		return {
			...(content === "" ? {} : { text: content }),
			...(slot ? pickDefinedStyle(slot) : {}),
		};
	}
	if (textShape === "slots") {
		return text === undefined ? {} : { text };
	}
	return {};
};
