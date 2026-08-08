import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/**
 * Converts an {@link Ellipse} (center + radii) to a {@link Frame} (center + dimensions).
 *
 * @param ellipse - The ellipse to convert; the frame is its bounding box, so
 *   the radii double into width / height
 */
export const convertEllipseToFrame = (ellipse: Ellipse): Frame => {
	const { cx, cy, rx, ry } = ellipse;
	return {
		cx,
		cy,
		width: rx * 2,
		height: ry * 2,
	};
};
