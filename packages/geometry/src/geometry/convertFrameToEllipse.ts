import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/**
 * Converts a Frame (center/dimensions based) to an Ellipse (center/radii based).
 *
 * @param frame - The frame geometry
 * @returns The corresponding Ellipse
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
