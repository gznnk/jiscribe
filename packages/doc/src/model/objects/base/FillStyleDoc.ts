import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Fill a shape is drawn with when `fill` is omitted and its type declares no
 * default of its own — the default the JSON schema documents. Renderers resolve
 * the absent field with this, so a document that leaves the fill out draws the
 * same as one that writes "transparent".
 */
export const DEFAULT_FILL = "transparent";

/**
 * Opacity a fill is drawn with when `fillOpacity` is omitted — fully opaque, so
 * an absent field leaves whatever alpha the color itself carries untouched.
 */
export const DEFAULT_FILL_OPACITY = 1;

/**
 * Properties related to fill styling.
 */
export type FillStyleDoc = {
	/** Fill color (CSS color string). */
	fill?: string;
	/** Fill opacity from 0 (invisible) to 1 (opaque), multiplying the color's own alpha. */
	fillOpacity?: number;
};

/**
 * Field names owned by FillStyleDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const FILL_STYLE_KEYS = exhaustiveKeysOf<FillStyleDoc>()([
	"fill",
	"fillOpacity",
] as const);
