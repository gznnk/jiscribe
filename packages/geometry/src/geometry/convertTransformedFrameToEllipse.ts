import type { TransformedEllipse } from "../types/TransformedEllipse";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Converts a {@link TransformedFrame} (center + dimensions) to a {@link TransformedEllipse} (center + radii).
 *
 * @param frame - The frame to convert; it is read as the ellipse's bounding
 *   box, so width / height halve into the radii while rotation and flips carry
 *   over unchanged
 */
export const convertTransformedFrameToEllipse = (
	frame: TransformedFrame,
): TransformedEllipse => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	return {
		cx,
		cy,
		rx: width / 2,
		ry: height / 2,
		rotation,
		scaleX,
		scaleY,
	};
};
