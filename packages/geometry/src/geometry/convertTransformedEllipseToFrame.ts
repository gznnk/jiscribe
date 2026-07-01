import type { TransformedEllipse } from "../types/TransformedEllipse";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Converts a TransformedEllipse (center/radii based) to a TransformedFrame (center/dimensions based).
 *
 * @param geometry - The transformed ellipse geometry
 * @returns The corresponding TransformedFrame
 */
export const convertTransformedEllipseToFrame = (
	geometry: TransformedEllipse,
): TransformedFrame => {
	const { cx, cy, rx, ry, rotation, scaleX, scaleY } = geometry;
	return {
		cx,
		cy,
		width: rx * 2,
		height: ry * 2,
		rotation,
		scaleX,
		scaleY,
	};
};
