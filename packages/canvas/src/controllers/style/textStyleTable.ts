import type { TextType } from "@jiscribe/doc/model/objects/types/text/TextType";
import { textStyleKeysOf } from "@jiscribe/doc/model/objects/types/text/TextType";

import { runOrSlot } from "./entries/runOrSlot";
import type { SlotsOf } from "./entries/slotEntry";
import type { StyleTable } from "./StyleEntry";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * What a type answers for on its text, derived from the one thing it declares
 * about it: which fields that text may carry at all (`textStyleKeysOf`) — so a
 * source-language body, whose own syntax sets the emphasis, is left out of those
 * intents without anyone branching on the text type again.
 *
 * Only `fontColor` is derived so far; the rest of the typography follows as
 * their intents move off StylePropertyRegistry.
 *
 * @param textType - The type's `ObjectFeatures.text`; one holding no text at all answers for nothing
 * @param slotsOf - Which slots a whole-slot write lands on; `defaultSlotsOf` for a type whose slots are the keys of its `text`
 * @returns The text half of the type's table; empty for a text type accepting none of the fields derived here
 */
export const textStyleTable = (
	textType: TextType | undefined,
	slotsOf: SlotsOf<ObjectState>,
): StyleTable<ObjectState> => {
	const keys = textStyleKeysOf(textType) as readonly string[];
	return {
		...(keys.includes("fontColor") && {
			fontColor: runOrSlot<ObjectState, string>("fontColor", { slotsOf }),
		}),
	};
};
