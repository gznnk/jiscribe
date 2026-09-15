import type { StrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";

/**
 * Properties related to stroke (outline) styling (runtime state).
 */
export type StrokeStyleState = {
	/** Stroke color (CSS color string). */
	stroke?: string;
	/** Stroke width in pixels. */
	strokeWidth?: number;
	/** Stroke dash type (e.g. 'solid', 'dashed', 'dotted'). */
	strokeDashType?: StrokeDashType;
	/** Stroke opacity from 0 (invisible) to 1 (opaque), multiplying the color's own alpha. */
	strokeOpacity?: number;
};
