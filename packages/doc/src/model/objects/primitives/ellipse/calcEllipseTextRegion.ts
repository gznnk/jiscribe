import type { Dimensions, Rect } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

/**
 * Inset that lands the region's corners on the ellipse: the inscribed
 * axis-aligned rect is w/√2 × h/√2, so each side insets by (1 - 1/√2) / 2.
 */
const ELLIPSE_INSET = (1 - 1 / Math.SQRT2) / 2;

/**
 * The largest rectangle inscribed in the ellipse, which is where its text is
 * laid out.
 *
 * @param doc - The ellipse's untransformed box; a zero side yields a zero-sided rect rather than NaN
 * @returns The region in local coordinates (shape center as origin), top-left based
 */
export const calcEllipseTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: ELLIPSE_INSET,
			right: ELLIPSE_INSET,
			bottom: ELLIPSE_INSET,
			left: ELLIPSE_INSET,
		},
	);
