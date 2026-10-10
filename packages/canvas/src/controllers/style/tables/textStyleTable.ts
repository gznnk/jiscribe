import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";
import { textStyleKeysOf } from "@jiscribe/doc/model/objects/types/text/TextType";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { isBoldFontWeight } from "../../utils/isBoldFontWeight";
import { toggleTextDecorationToken } from "../../utils/toggleTextDecorationToken";
import { runOrSlot } from "../entries/runOrSlot";
import type { SlotsOf } from "../entries/slotEntry";
import { slotField } from "../entries/slotField";
import { textContentEntry } from "../entries/textContentEntry";
import { toggleRunOrSlot } from "../entries/toggleRunOrSlot";
import type { StyleTable } from "../StyleEntry";

/**
 * What a type answers for on its text, derived from the one thing it declares
 * about it: which fields that text may carry at all (`textStyleKeysOf`) — so a
 * source-language body, whose own syntax sets the emphasis, is left out of those
 * intents without anyone branching on the text type again. The three keystroke
 * toggles ride on the field each of them flips, and are gated with it.
 *
 * The content itself is answered for by every type holding text, whatever fields
 * that text accepts.
 *
 * @param textType - The type's `ObjectFeatures.text`, which is what decides the fields; only a type declaring one has a text half at all, so there is no "no text" case here
 * @param slotsOf - Which slots a whole-slot write lands on; `defaultSlotsOf` for a type whose slots are the keys of its `text`
 * @returns The text half of the type's table; the content alone for a text type accepting none of the fields
 */
export const textStyleTable = (
	textType: TextType,
	slotsOf: SlotsOf<ObjectState>,
): StyleTable<ObjectState> => {
	const keys = textStyleKeysOf(textType);
	const accepts = (field: keyof TextSlotStyle): boolean => keys.includes(field);
	return {
		textContent: textContentEntry,
		...(accepts("fontColor") && {
			fontColor: runOrSlot("fontColor", { slotsOf }),
		}),
		...(accepts("fontSize") && {
			fontSize: runOrSlot("fontSize", { slotsOf }),
		}),
		...(accepts("fontFamily") && {
			fontFamily: runOrSlot("fontFamily", { slotsOf }),
		}),
		...(accepts("fontWeight") && {
			fontWeight: runOrSlot("fontWeight", { slotsOf }),
			toggleBold: toggleRunOrSlot("toggleBold", {
				slotsOf,
				toggle: (current) => (isBoldFontWeight(current) ? "normal" : "bold"),
			}),
		}),
		...(accepts("fontStyle") && {
			fontStyle: runOrSlot("fontStyle", { slotsOf }),
			toggleItalic: toggleRunOrSlot("toggleItalic", {
				slotsOf,
				toggle: (current) => (current === "italic" ? "normal" : "italic"),
			}),
		}),
		...(accepts("textDecoration") && {
			textDecoration: runOrSlot("textDecoration", { slotsOf }),
			// The other decoration line is kept, which is why the toggle takes the
			// value rather than a boolean.
			toggleUnderline: toggleRunOrSlot("toggleUnderline", {
				slotsOf,
				toggle: (current) => toggleTextDecorationToken(current, "underline"),
			}),
		}),
		// The alignments place the whole block, so they land on the slot even while
		// a stretch of it is selected — there is nothing smaller to apply them to.
		...(accepts("textAlign") && {
			textAlign: slotField("textAlign", { slotsOf }),
		}),
		...(accepts("verticalAlign") && {
			verticalAlign: slotField("verticalAlign", { slotsOf }),
		}),
	};
};
