import { calcLightningPoints } from "../../schema/lightning/calcLightningPoints";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildPolygonPath } from "../shared/pictogramPaths";

/**
 * Lays out a lightning bolt over the bounding box whose top-left corner is at
 * (x, y): one closed polygon (calcLightningPoints), the same corners the outline
 * hands to the connector router. Shared by the object renderer (centered origin)
 * and the draw-drag preview that reuses it.
 */
export const buildLightningFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => ({
	body: [buildPolygonPath(calcLightningPoints(x, y, width, height))],
});
