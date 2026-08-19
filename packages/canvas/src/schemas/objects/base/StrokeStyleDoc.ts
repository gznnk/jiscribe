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
 * Every enumeration of the group is built from this, so a field added to the type
 * reaches them all without any being edited.
 */
export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
	"stroke",
	"strokeWidth",
	"strokeDashType",
] as const);
