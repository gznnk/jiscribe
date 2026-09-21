import { exhaustiveKeysOf } from "../../utils/exhaustiveKeys";

/**
 * Smallest admissible `fontSize` — the `minimum` the JSON schema states for it.
 * Read by both boundaries that check the field: the doc validator
 * (validateDocUtils) and the paste guard (validateStateUtils), a connector's
 * label included.
 */
export const FONT_SIZE_MIN = 1;

/**
 * The ground a body of text is drawn on: the typography every character takes
 * unless something marks it out. Kept apart from {@link TextEmphasisStyle}
 * because a body written in a source language (`ObjectFeatures.text: "source"`)
 * carries this half alone.
 */
export type TextBaseStyle = {
	/** Text color (CSS color string) */
	fontColor?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	fontFamily?: string;
};

/** Field names of the ground typography, in the order a slot declares them. */
export const TEXT_BASE_STYLE_KEYS = exhaustiveKeysOf<TextBaseStyle>()([
	"fontColor",
	"fontSize",
	"fontFamily",
] as const);
