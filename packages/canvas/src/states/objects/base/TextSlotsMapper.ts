import { BODY_TEXT_SLOT_ID } from "../../../constants/textSlotId";
import type { TextStyleDoc } from "../../../schemas/objects/base/TextStyleDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import type { RichText } from "../../../schemas/objects/types/RichText";
import {
	isRichText,
	normalizeRichText,
	richTextToPlain,
} from "../../../schemas/objects/types/RichText";
import type { TextSlot } from "../../../schemas/objects/types/TextSlot";
import { TEXT_SLOT_STYLE_KEYS } from "../../../schemas/objects/types/TextSlot";
import {
	isTextSlots,
	readRichTextSlot,
	type TextSlots,
} from "../types/TextSlots";

/**
 * The doc fields the text group occupies, in either shape: the flat TextStyleDoc
 * for a single-body type, the keyed slots for a type that spells them out.
 */
export type TextDocFields = Omit<TextStyleDoc, "text"> & {
	text?: RichText | TextSlots;
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
 * Whether a slot id would be re-sorted by the JS engine. Own keys that are
 * canonical array indices — integers 0 … 2^32−2 in their shortest decimal form —
 * are enumerated first, in ascending numeric order, so such an id would silently
 * move within a slot map whose key order decides the default slot and the drawing
 * order (issue #231). Only exactly that set is matched: ids like "1.5", "Infinity"
 * or "4294967295" keep their insertion place, so dropping them would lose their
 * slot (and its text) for nothing.
 */
const isIntegerLikeSlotId = (slotId: string): boolean => {
	const n = Number(slotId);
	return (
		Number.isInteger(n) && n >= 0 && n < 2 ** 32 - 1 && String(n) === slotId
	);
};

/**
 * Expands a doc's text group into the state normal form (keyed slots).
 *
 * A `"body"` type's flat doc becomes the single `body` slot, its root styling
 * moving into that slot; the slot is materialized even when the doc carries
 * neither text nor styling, because a text-bearing shape always has a slot to
 * edit, which is what makes the key set the authority on slots. A `"slots"` type
 * is already in the normal form and passes through — its closed key set is the
 * type's own mapper to guarantee (see the record shape) — except for the one rule
 * every type shares: an integer-like slot id is dropped here, since the key order
 * would not survive it (see {@link isIntegerLikeSlotId}).
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
		// Normalized on the way in, so the slots the canvas works with are always in
		// the canonical form and an unstyled body stays the plain string it was.
		const content = isRichText(doc.text) ? normalizeRichText(doc.text) : "";
		return {
			text: {
				[BODY_TEXT_SLOT_ID]: { text: content, ...pickDefinedStyle(doc) },
			},
		};
	}
	if (textShape === "slots") {
		if (!isTextSlots(doc.text)) {
			return { text: {} };
		}
		const slots: TextSlots = {};
		for (const [slotId, slot] of Object.entries(doc.text)) {
			if (!isIntegerLikeSlotId(slotId)) {
				slots[slotId] = slot;
			}
		}
		return { text: slots };
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
		const content = normalizeRichText(
			readRichTextSlot(text, BODY_TEXT_SLOT_ID),
		);
		const slot = text?.[BODY_TEXT_SLOT_ID];
		return {
			// A text with no characters left carries no styling either, whichever form
			// it is in, so it drops out exactly like an absent doc field.
			...(richTextToPlain(content) === "" ? {} : { text: content }),
			...(slot ? pickDefinedStyle(slot) : {}),
		};
	}
	if (textShape === "slots") {
		return text === undefined ? {} : { text };
	}
	return {};
};
