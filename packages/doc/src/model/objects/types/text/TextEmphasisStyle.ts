import { exhaustiveKeysOf } from "../../utils/exhaustiveKeys";

/**
 * The typography that marks characters out from the ground around them. The half
 * a source language spells out in its own syntax, and so the half a
 * `text: "source"` shape does not carry (SourceTextStyleDoc).
 */
export type TextEmphasisStyle = {
	/** Font weight */
	fontWeight?: string;
	/** Font style ("normal" | "italic"; CSS font-style value) */
	fontStyle?: string;
	/**
	 * Text decoration lines: "underline" / "line-through", space-separated when
	 * both apply (canonical order: underline first). "none" or absent means no
	 * decoration.
	 */
	textDecoration?: string;
};

/** Field names of the emphasis typography, in the order a slot declares them. */
export const TEXT_EMPHASIS_STYLE_KEYS = exhaustiveKeysOf<TextEmphasisStyle>()([
	"fontWeight",
	"fontStyle",
	"textDecoration",
] as const);
