import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";
import { textStyleKeysOf } from "@jiscribe/doc/model/objects/types/text/TextType";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { runOrTextSlotEntry } from "../entries/runOrTextSlotEntry";
import { textContentEntry } from "../entries/textContentEntry";
import { textSlotFieldEntry } from "../entries/textSlotFieldEntry";
import type { StyleTable } from "../StyleEntry";

/**
 * What a type answers for on its text, derived from the one thing it declares
 * about it: which fields that text may carry at all (`textStyleKeysOf`) — so a
 * source-language body, whose own syntax sets the emphasis, is left out of those
 * intents without anyone branching on the text type again.
 *
 * The content itself is answered for by every type holding text, whatever fields
 * that text accepts. Which slots a write lands on is the picked kind's answer
 * (resolveTextSlotIds), not the type's. Every kind it can hold is in
 * TEXT_STYLE_INTENT_KINDS.
 *
 * @param textType - The type's `ObjectFeatures.text`, which is what decides the fields; only a type declaring one has a text half at all, so there is no "no text" case here
 * @returns The text half of the type's table; the content alone for a text type accepting none of the fields
 */
export const textStyleTable = (textType: TextType): StyleTable<ObjectState> => {
	const keys = textStyleKeysOf(textType);
	const accepts = (field: keyof TextSlotStyle): boolean => keys.includes(field);
	return {
		textContent: textContentEntry,
		...(accepts("fontColor") && {
			fontColor: runOrTextSlotEntry("fontColor"),
		}),
		...(accepts("fontSize") && {
			fontSize: runOrTextSlotEntry("fontSize"),
		}),
		...(accepts("fontFamily") && {
			fontFamily: runOrTextSlotEntry("fontFamily"),
		}),
		...(accepts("fontWeight") && {
			fontWeight: runOrTextSlotEntry("fontWeight"),
		}),
		...(accepts("fontStyle") && {
			fontStyle: runOrTextSlotEntry("fontStyle"),
		}),
		...(accepts("textDecoration") && {
			textDecoration: runOrTextSlotEntry("textDecoration"),
		}),
		// The alignments place the whole block, so they land on the slot even while
		// a stretch of it is selected — there is nothing smaller to apply them to.
		...(accepts("textAlign") && {
			textAlign: textSlotFieldEntry("textAlign"),
		}),
		...(accepts("verticalAlign") && {
			verticalAlign: textSlotFieldEntry("verticalAlign"),
		}),
	};
};
