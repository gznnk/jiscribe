import { calcFolderPoints } from "./calcFolderPoints";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildPolygonPath } from "../shared/pictogramPaths";

/**
 * Lays out a folder over the bounding box whose top-left corner is at (x, y).
 * One closed silhouette and no detail lines — the tab alone carries the meaning.
 * Shared by the object renderer (centered origin) and the draw-drag preview
 * that reuses it.
 */
export const buildFolderFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => ({
	body: [buildPolygonPath(calcFolderPoints(x, y, width, height))],
});
