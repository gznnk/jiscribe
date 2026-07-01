import type { StrokeDashType } from "../types/StrokeDashType";
import { exhaustiveKeysOf } from "../utils/exhaustiveKeys";

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
};

/**
 * Field names owned by StrokeStyleDoc/State (identical for Doc and State).
 * Referenced by Frame mappers to pass the stroke group through via an allow-list.
 */
export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
	"stroke",
	"strokeWidth",
	"strokeDashType",
] as const);
