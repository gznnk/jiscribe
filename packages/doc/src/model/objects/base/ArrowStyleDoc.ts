import type { ArrowType } from "../types/ArrowType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

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
