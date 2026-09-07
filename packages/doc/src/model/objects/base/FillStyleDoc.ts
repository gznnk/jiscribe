import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Fill a shape is drawn with when `fill` is omitted and its type declares no
 * default of its own — the default the JSON schema documents. Renderers resolve
 * the absent field with this, so a document that leaves the fill out draws the
 * same as one that writes "transparent".
 */
export const DEFAULT_FILL = "transparent";

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
