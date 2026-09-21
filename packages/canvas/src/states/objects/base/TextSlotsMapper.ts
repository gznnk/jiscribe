import type { TextStyleDoc } from "@jiscribe/doc/model/objects/base/TextStyleDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import {
	isRichText,
	normalizeRichText,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/RichText";
import type { TextType } from "@jiscribe/doc/model/objects/types/TextType";
import {
	isSingleBodyText,
	textStyleKeysOf,
} from "@jiscribe/doc/model/objects/types/TextType";
import { pickDefined } from "@jiscribe/doc/model/objects/utils/pickDefined";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";

import type { TextStyleState } from "./TextStyleState";
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
 * The body a root-form doc holds, in the form its text type admits: a `"source"`
 * body is drawn by the shape's own renderer, which reads no run, so a run-styled
 * one is read as its characters alone — the same string the way back writes.
 */
const readBodyContent = (
	textType: TextType | undefined,
	docText: TextDocFields["text"],
): RichText => {
	if (!isRichText(docText)) {
		return "";
	}
	return textType === "source"
		? richTextToPlain(docText)
		: normalizeRichText(docText);
};

/**
 * Expands a doc's text group into the state normal form (keyed slots).
 *
 * A root-form type's flat doc becomes the single `body` slot, its root styling
 * moving into that slot; the slot is materialized even when the doc carries
 * neither text nor styling, because a text-bearing shape always has a slot to
 * edit, which is what makes the key set the authority on slots. The styling that
 * moves is what the text type accepts (`textStyleKeysOf`), so a field written on
 * a doc whose type cannot hold it never reaches the canvas. A `"slots"` type is
 * already in the normal form and passes through — its closed key set is the
 * type's own mapper to guarantee (see the record shape) — except for the one rule
 * every type shares: an integer-like slot id is dropped here, since the key order
 * would not survive it (see {@link isIntegerLikeSlotId}).
 *
 * The body's own placement fields (TEXT_BODY_KEYS) ride along on the object
 * rather than entering the slot, and only for a root-form type: they place the one
 * body against the shape, which a keyed slot has no counterpart for.
 *
 * @param textType - The type's `features.text`; undefined yields no `text` key at all
 * @param doc - The doc being converted; only its text group is read
 * @returns `{}` for a text-less type, otherwise `{ text }` with a fresh slot map, plus `textVerticalBasis` when a single-body doc sets one
 */
export const mapTextDocToState = (
	textType: TextType | undefined,
	doc: TextDocFields,
): Partial<TextStyleState> => {
	if (isSingleBodyText(textType)) {
		// Normalized on the way in, so the slots the canvas works with are always in
		// the canonical form and an unstyled body stays the plain string it was.
		const content = readBodyContent(textType, doc.text);
		return {
			text: {
				[BODY_TEXT_SLOT_ID]: {
					text: content,
					...pickDefined(doc, textStyleKeysOf(textType)),
				},
			},
			...(doc.textVerticalBasis !== undefined
				? { textVerticalBasis: doc.textVerticalBasis }
				: {}),
		};
	}
	if (textType === "slots") {
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
 * A root-form type flattens its one slot: an empty content and unset styling each
 * drop out, which is exactly what an absent doc field expands back to, making
 * doc → state → doc the identity. Only the styling the text type accepts is
 * written back (`textStyleKeysOf`), so a field that slipped into the slot cannot
 * be saved onto a doc that has no place for it, and a `"source"` body is
 * flattened to its characters, since the doc holds it as a plain string. The
 * body's placement fields (TEXT_BODY_KEYS) come back off the object under the
 * same rule. A `"slots"` type is emitted unchanged.
 *
 * @param textType - The type's `features.text`; undefined yields no fields at all
 * @param state - The state's text group: its slots, and the body placement fields that sit beside them
 * @returns The text group's doc fields, each key present only when it has a value
 */
export const mapTextStateToDoc = (
	textType: TextType | undefined,
	state: TextStyleState,
): TextDocFields => {
	const text = state.text;
	if (isSingleBodyText(textType)) {
		const content = normalizeRichText(
			readRichTextSlot(text, BODY_TEXT_SLOT_ID),
		);
		const plain = richTextToPlain(content);
		const slot = text?.[BODY_TEXT_SLOT_ID];
		return {
			// A text with no characters left carries no styling either, whichever form
			// it is in, so it drops out exactly like an absent doc field.
			...(plain === ""
				? {}
				: { text: textType === "source" ? plain : content }),
			...(slot ? pickDefined(slot, textStyleKeysOf(textType)) : {}),
			...(state.textVerticalBasis !== undefined
				? { textVerticalBasis: state.textVerticalBasis }
				: {}),
		};
	}
	if (textType === "slots") {
		return text === undefined ? {} : { text };
	}
	return {};
};
