import type { ArrowType } from "../types/ArrowType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Mark an end is drawn with when its field is omitted and the type declares no
 * default of its own — the member of {@link ArrowType} that draws nothing, so an
 * end nobody set reads as a value rather than as no answer.
 */
export const DEFAULT_ARROW: ArrowType = "None";

/**
 * Properties related to arrowheads, the group `features.arrow` stands for. Mixed into a
 * type's Doc by `CreateObjectType` when the flag is set, the same as every other style
 * group (polyline and connector are the two that set it).
 */
export type ArrowStyleDoc = {
	/** Arrowhead drawn at the start of the line. Omitted means none. */
	startArrow?: ArrowType;
	/** Arrowhead drawn at the end of the line. Omitted means none. */
	endArrow?: ArrowType;
};

/**
 * Field names owned by ArrowStyleDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const ARROW_STYLE_KEYS = exhaustiveKeysOf<ArrowStyleDoc>()([
	"startArrow",
	"endArrow",
] as const);
