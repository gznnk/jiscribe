import { calcGearPoints } from "./calcGearPoints";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildEllipsePath, buildPolygonPath } from "../shared/pictogramPaths";

/** The bore, as a fraction of the tip radius. Punched out, so the outline ignores it. */
const GEAR_BORE_RATIO = 0.3;

/**
 * Lays out a gear over the bounding box whose top-left corner is at (x, y): the
 * toothed rim (calcGearPoints), with the bore riding along as a second subpath
 * of the same body path. That is why the figure asks for `fill-rule: evenodd` —
 * the bore has to be punched out of the fill, not painted over it.
 *
 * Punched out means unpainted, so the bore is repeated as a hit path
 * (PictogramFigure.hit): otherwise the shape's own visual center — where a
 * pointer naturally aims — would select nothing.
 *
 * Shared by the object renderer (centered origin), the draw-drag preview that
 * reuses it, and the stencil icon.
 */
export const buildGearFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const bore = buildEllipsePath(
		x + width / 2,
		y + height / 2,
		(width / 2) * GEAR_BORE_RATIO,
		(height / 2) * GEAR_BORE_RATIO,
	);
	return {
		body: [`${buildPolygonPath(calcGearPoints(x, y, width, height))} ${bore}`],
		fillRule: "evenodd",
		hit: [bore],
	};
};
