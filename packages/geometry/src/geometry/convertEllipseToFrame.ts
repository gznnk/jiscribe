import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/** Converts an {@link Ellipse} (center + radii) to a {@link Frame} (center + dimensions). */
export const convertEllipseToFrame = (ellipse: Ellipse): Frame => {
	const { cx, cy, rx, ry } = ellipse;
	return {
		cx,
		cy,
		width: rx * 2,
		height: ry * 2,
	};
};
