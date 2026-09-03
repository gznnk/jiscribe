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
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 * A rect's rx is a rounded-corner style rather than geometry, so it is passed through here.
 */
export const RADIUS_STYLE_KEYS = exhaustiveKeysOf<RadiusStyleDoc>()([
	"rx",
] as const);
