import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/**
 * Converts an Ellipse (center/radii based) to a Frame (center/dimensions based).
 *
 * @param geometry - The ellipse geometry
 * @returns The corresponding Frame
 */
export const convertEllipseToFrame = (geometry: Ellipse): Frame => {
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
