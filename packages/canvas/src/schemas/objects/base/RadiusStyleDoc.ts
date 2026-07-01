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
 * Field names occupied by RadiusStyleDoc/State (identical for Doc/State).
 * Referenced when Frame mappers pass the radius group through via an allow-list.
 * A rect's rx is a rounded-corner style rather than geometry, so it is passed through here.
 */
export const RADIUS_STYLE_KEYS = exhaustiveKeysOf<RadiusStyleDoc>()([
	"rx",
] as const);
