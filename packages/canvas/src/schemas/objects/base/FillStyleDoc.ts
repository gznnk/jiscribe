import { exhaustiveKeysOf } from "../types/exhaustiveKeys";

/**
 * Properties related to fill styling.
 */
export type FillStyleDoc = {
	/** Fill color (CSS color string). */
	fill?: string;
};

/**
 * FillStyleDoc/State が占有するフィールド名（Doc/State で同一）。
 * Frame 系マッパーが fill グループを allow-list で素通しする際に参照する。
 */
export const FILL_STYLE_KEYS = exhaustiveKeysOf<FillStyleDoc>()([
	"fill",
] as const);
