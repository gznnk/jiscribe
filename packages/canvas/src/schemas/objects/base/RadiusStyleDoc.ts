import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Radius style properties for objects (Document format).
 * Used for objects with rounded corners (e.g., rect).
 */
export type RadiusStyleDoc = {
	/** Border radius for rounded corners (SVG rx attribute) */
	rx?: number;
};

/**
 * RadiusStyleDoc/State が占有するフィールド名（Doc/State で同一）。
 * Frame 系マッパーが radius グループを allow-list で素通しする際に参照する。
 * rect の rx は geometry ではなく角丸スタイルなので、ここで pass-through される。
 */
export const RADIUS_STYLE_KEYS = exhaustiveKeysOf<RadiusStyleDoc>()([
	"rx",
] as const);
