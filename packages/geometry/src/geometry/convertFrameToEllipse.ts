import type { Ellipse } from "../types/Ellipse";
import type { Frame } from "../types/Frame";

/** Converts a {@link Frame} (center + dimensions) to an {@link Ellipse} (center + radii). */
export const convertFrameToEllipse = (frame: Frame): Ellipse => {
	const { cx, cy, width, height } = frame;
	return {
		cx,
		cy,
		rx: width / 2,
		ry: height / 2,
	};
};
