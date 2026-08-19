import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Properties related to fill styling.
 */
export type FillStyleDoc = {
	/** Fill color (CSS color string). */
	fill?: string;
};

/**
 * Field names owned by FillStyleDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const FILL_STYLE_KEYS = exhaustiveKeysOf<FillStyleDoc>()([
	"fill",
] as const);
