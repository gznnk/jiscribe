import type { StrokeDashType } from "../types/StrokeDashType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

/**
 * Width a stroke is drawn with when `strokeWidth` is omitted — the default the
 * JSON schema documents. Renderers resolve the absent field with this, so a
 * document that leaves the width out draws the same as one that writes 2.
 */
export const DEFAULT_STROKE_WIDTH = 2;

/**
 * Smallest admissible `strokeWidth` — the `minimum` the JSON schema states for
 * it. Read by both boundaries that check the field: the doc validator
 * (validateDocUtils) and the paste guard (validateStateUtils), a connector's
 * label included.
 */
export const STROKE_WIDTH_MIN = 0;

/**
 * Opacity a stroke is drawn with when `strokeOpacity` is omitted — fully opaque,
 * so an absent field leaves whatever alpha the color itself carries untouched.
 */
export const DEFAULT_STROKE_OPACITY = 1;

/**
 * Properties related to stroke (outline) styling.
 */
export type StrokeStyleDoc = {
	/** Stroke color (CSS color string). */
	stroke?: string;
	/** Stroke width in pixels. */
	strokeWidth?: number;
	/** Stroke dash type (e.g. 'solid', 'dashed', 'dotted'). */
	strokeDashType?: StrokeDashType;
	/** Stroke opacity from 0 (invisible) to 1 (opaque), multiplying the color's own alpha. */
	strokeOpacity?: number;
};

/**
 * Field names owned by StrokeStyleDoc/State (identical for Doc and State).
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
	"stroke",
	"strokeWidth",
	"strokeDashType",
	"strokeOpacity",
] as const);
