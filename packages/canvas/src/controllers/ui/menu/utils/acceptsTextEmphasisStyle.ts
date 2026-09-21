import { TEXT_EMPHASIS_STYLE_KEYS } from "@jiscribe/doc/model/objects/types/RichText";
import type { TextType } from "@jiscribe/doc/model/objects/types/TextType";
import { textStyleKeysOf } from "@jiscribe/doc/model/objects/types/TextType";

/**
 * Whether a text of this type takes any of the emphasis fields (bold, italic,
 * the decoration lines). The format controls on both default surfaces — the
 * ObjectMenu's `fontStyle` item and the property panel's `textFormat` row —
 * write nothing else, so this is what decides whether either is offered at all.
 *
 * @param textType - The type's `ObjectFeatures.text`; `undefined`, a type holding no text, is false
 * @returns True when at least one emphasis field is accepted, which every text type but `"source"` is
 */
export const acceptsTextEmphasisStyle = (
	textType: TextType | undefined,
): boolean => {
	const accepted = textStyleKeysOf(textType) as readonly string[];
	return TEXT_EMPHASIS_STYLE_KEYS.some((key) => accepted.includes(key));
};
