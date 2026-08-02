import { calcPackagePoints } from "./calcPackagePoints";
import { PACKAGE_SHOULDER_RATIO } from "../../schema/package/PackageDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildPolygonPath } from "../shared/pictogramPaths";

/**
 * Lays out an isometric box over the bounding box whose top-left corner is at
 * (x, y): the hexagonal silhouette, plus the three edges meeting at its center
 * that separate the top face from the two side faces. Shared by the object
 * renderer (centered origin), the draw-drag preview that reuses it, and the
 * stencil icon.
 */
export const buildPackageFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const centerX = x + width / 2;
	const centerY = y + height / 2;
	const shoulderY = y + height * PACKAGE_SHOULDER_RATIO;
	return {
		body: [buildPolygonPath(calcPackagePoints(x, y, width, height))],
		detail: [
			// Down to the bottom vertex, not up to the apex: these three are the
			// edges of the box's near corner, and they are what splits the hexagon
			// into a top face and two side faces. Running the vertical one upwards
			// instead leaves the lower half undivided, which reads as an open carton.
			`M ${centerX} ${centerY} V ${y + height}`,
			`M ${centerX} ${centerY} L ${x} ${shoulderY}`,
			`M ${centerX} ${centerY} L ${x + width} ${shoulderY}`,
		],
	};
};
