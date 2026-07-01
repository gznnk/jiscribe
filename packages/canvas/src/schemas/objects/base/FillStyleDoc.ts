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
 * Referenced by Frame mappers to pass the fill group through via an allow-list.
 */
export const FILL_STYLE_KEYS = exhaustiveKeysOf<FillStyleDoc>()([
	"fill",
] as const);
