import type { TransformedEllipse } from "../types/TransformedEllipse";
import type { TransformedFrame } from "../types/TransformedFrame";

/** Converts a {@link TransformedEllipse} (center + radii) to a {@link TransformedFrame} (center + dimensions). */
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
