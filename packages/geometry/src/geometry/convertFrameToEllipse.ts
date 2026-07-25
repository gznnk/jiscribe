import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/**
 * Converts a {@link Frame} (center + dimensions) to an {@link Ellipse} (center + radii).
 *
 * @param frame - The frame to convert; it is read as the ellipse's bounding
 *   box, so width / height halve into the radii
 */
export const convertFrameToEllipse = (frame: Frame): Ellipse => {
	const { cx, cy, width, height } = frame;
	return {
		cx,
		cy,
		rx: width / 2,
		ry: height / 2,
	};
};
