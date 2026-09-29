import { isObject } from "@jiscribe/basic-validators";
import type { TextStyleDoc } from "@jiscribe/doc/model/objects/base/TextStyleDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import {
	normalizeRichText,
	richTextToPlain,
} from "@jiscribe/doc/model/objects/types/text/RichText";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";
import {
	isSingleBodyText,
	textStyleKeysOf,
} from "@jiscribe/doc/model/objects/types/text/TextType";
import { pickDefined } from "@jiscribe/doc/model/objects/utils/pickDefined";

import type { TextStyleState } from "./TextStyleState";
import { readRichTextSlot, type TextSlots } from "../types/TextSlots";

/**
 * The doc fields the text group occupies, in either shape: the flat TextStyleDoc
 * for a single-body type, the keyed slots for a type that spells them out.
 */
export type TextDocFields = Omit<TextStyleDoc, "text"> & {
	text?: RichText | TextSlots;
};

/**
 * Which of the two forms the text group is written in, told apart by shape alone:
 * a record is the keyed form, a string or a run list is one body. Whether the form
 * is the one the type admits is the parser's to reject, so nothing here reads the
 * content.
 */
const isTextSlotsShape = (text: TextDocFields["text"]): text is TextSlots =>
	isObject(text);

/**
 * The body a root-form doc holds, in canonical form so an unstyled body stays the
 * plain string it was. A `"source"` doc holds it as a string, which passes through
 * unchanged.
 */
const readBodyContent = (docText: TextDocFields["text"]): RichText => {
	if (docText === undefined || isTextSlotsShape(docText)) {
		return "";
	}
	return normalizeRichText(docText);
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
 * type's own mapper to guarantee (see the record shape).
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
		const content = readBodyContent(doc.text);
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
		const docText = doc.text;
		// Copied rather than aliased: the state owns its slot map, and a doc created
		// from a type's defaults hands out the same object to every shape.
		return { text: isTextSlotsShape(docText) ? { ...docText } : {} };
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
