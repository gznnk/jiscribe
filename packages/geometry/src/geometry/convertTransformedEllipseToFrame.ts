import type { TransformedEllipse } from "../types/TransformedEllipse";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Converts a {@link TransformedEllipse} (center + radii) to a {@link TransformedFrame} (center + dimensions).
 *
 * @param ellipse - The ellipse to convert; its rotation and flips carry over
 *   unchanged, so only the radii are reinterpreted
 */
export const convertTransformedEllipseToFrame = (
	ellipse: TransformedEllipse,
): TransformedFrame => {
	const { cx, cy, rx, ry, rotation, scaleX, scaleY } = ellipse;
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
