import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/**
 * Converts an Ellipse (center/radii based) to a Frame (center/dimensions based).
 *
 * @param ellipse - The ellipse geometry
 * @returns The corresponding Frame
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
