import {
	LAPTOP_SCREEN_HEIGHT_RATIO,
	LAPTOP_SCREEN_WIDTH_RATIO,
	LAPTOP_SCREEN_X_RATIO,
} from "../../schema/laptop/LaptopDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildRoundedRectPath } from "../shared/pictogramPaths";

/** Corner radius of the screen, as a fraction of the shorter side. */
const LAPTOP_CORNER_RATIO = 0.05;

/**
 * Lays out a laptop over the bounding box whose top-left corner is at (x, y):
 * two silhouettes — the screen, and the base splaying out below it to the full
 * width of the box. Both are bodies rather than one being detail, so a fill set
 * on the shape reaches the base too. Shared by the object renderer (centered
 * origin), the draw-drag preview that reuses it, and the stencil icon.
 */
export const buildLaptopFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const screenX = x + width * LAPTOP_SCREEN_X_RATIO;
	const screenWidth = width * LAPTOP_SCREEN_WIDTH_RATIO;
	const screenBottom = y + height * LAPTOP_SCREEN_HEIGHT_RATIO;
	return {
		body: [
			buildRoundedRectPath(
				screenX,
				y,
				screenWidth,
				height * LAPTOP_SCREEN_HEIGHT_RATIO,
				Math.min(width, height) * LAPTOP_CORNER_RATIO,
			),
			`M ${screenX} ${screenBottom} H ${screenX + screenWidth} ` +
				`L ${x + width} ${y + height} H ${x} Z`,
		],
	};
};
