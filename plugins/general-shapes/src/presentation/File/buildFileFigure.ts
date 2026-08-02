import { calcFileFoldSize } from "./calcFileFoldSize";
import { calcFilePoints } from "./calcFilePoints";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildPolygonPath } from "../shared/pictogramPaths";

/**
 * Lays out a file over the bounding box whose top-left corner is at (x, y): the
 * cut silhouette, plus the two edges of the folded-back corner as detail. The
 * fold is what tells it apart from the flowchart document (wavy bottom edge) and
 * card (clipped top-left corner). Shared by the object renderer (centered
 * origin), the draw-drag preview that reuses it, and the stencil icon.
 */
export const buildFileFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const fold = calcFileFoldSize(width, height);
	return {
		body: [buildPolygonPath(calcFilePoints(x, y, width, height))],
		detail: [`M ${x + width - fold} ${y} V ${y + fold} H ${x + width}`],
	};
};
