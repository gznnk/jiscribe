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
 * StrokeStyleDoc/State が占有するフィールド名（Doc/State で同一）。
 * Frame 系マッパーが stroke グループを allow-list で素通しする際に参照する。
 */
export const STROKE_STYLE_KEYS = exhaustiveKeysOf<StrokeStyleDoc>()([
	"stroke",
	"strokeWidth",
	"strokeDashType",
] as const);
