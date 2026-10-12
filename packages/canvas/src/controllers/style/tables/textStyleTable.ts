import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";
import { textStyleKeysOf } from "@jiscribe/doc/model/objects/types/text/TextType";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isBoldFontWeight } from "../../utils/isBoldFontWeight";
import { toggleTextDecorationToken } from "../../utils/toggleTextDecorationToken";
import { runOrSlotEntry } from "../entries/runOrSlotEntry";
import { slotFieldEntry } from "../entries/slotFieldEntry";
import { textContentEntry } from "../entries/textContentEntry";
import { toggleRunOrSlotEntry } from "../entries/toggleRunOrSlotEntry";
import type { StyleTable } from "../StyleEntry";

/**
 * What a type answers for on its text, derived from the one thing it declares
 * about it: which fields that text may carry at all (`textStyleKeysOf`) — so a
 * source-language body, whose own syntax sets the emphasis, is left out of those
 * intents without anyone branching on the text type again. The three keystroke
 * toggles ride on the field each of them flips, and are gated with it.
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
			fontColor: runOrSlotEntry("fontColor"),
		}),
		...(accepts("fontSize") && {
			fontSize: runOrSlotEntry("fontSize"),
		}),
		...(accepts("fontFamily") && {
			fontFamily: runOrSlotEntry("fontFamily"),
		}),
		...(accepts("fontWeight") && {
			fontWeight: runOrSlotEntry("fontWeight"),
			toggleBold: toggleRunOrSlotEntry("toggleBold", {
				toggle: (current) => (isBoldFontWeight(current) ? "normal" : "bold"),
			}),
		}),
		...(accepts("fontStyle") && {
			fontStyle: runOrSlotEntry("fontStyle"),
			toggleItalic: toggleRunOrSlotEntry("toggleItalic", {
				toggle: (current) => (current === "italic" ? "normal" : "italic"),
			}),
		}),
		...(accepts("textDecoration") && {
			textDecoration: runOrSlotEntry("textDecoration"),
			// The other decoration line is kept, which is why the toggle takes the
			// value rather than a boolean.
			toggleUnderline: toggleRunOrSlotEntry("toggleUnderline", {
				toggle: (current) => toggleTextDecorationToken(current, "underline"),
			}),
		}),
		// The alignments place the whole block, so they land on the slot even while
		// a stretch of it is selected — there is nothing smaller to apply them to.
		...(accepts("textAlign") && {
			textAlign: slotFieldEntry("textAlign"),
		}),
		...(accepts("verticalAlign") && {
			verticalAlign: slotFieldEntry("verticalAlign"),
		}),
	};
};
