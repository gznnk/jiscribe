import {
	SMARTPHONE_SCREEN_HEIGHT_RATIO,
	SMARTPHONE_SCREEN_WIDTH_RATIO,
	SMARTPHONE_SCREEN_X_RATIO,
	SMARTPHONE_SCREEN_Y_RATIO,
} from "../../schema/smartphone/SmartphoneDoc";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildHorizontalLinePath,
	buildRoundedRectPath,
} from "../shared/pictogramPaths";

/** Corner radius of the case, as a fraction of the shorter side. */
const SMARTPHONE_CORNER_RATIO = 0.13;

/** Corner radius of the screen, as a fraction of the case's. */
const SMARTPHONE_SCREEN_CORNER_RATIO = 0.4;

/** Speaker slit and home bar: half-widths and y positions as fractions of the box. */
const SMARTPHONE_SPEAKER_HALF_WIDTH_RATIO = 0.13;
const SMARTPHONE_SPEAKER_Y_RATIO = 0.045;
const SMARTPHONE_HOME_BAR_HALF_WIDTH_RATIO = 0.18;
const SMARTPHONE_HOME_BAR_Y_RATIO = 0.945;

/**
 * Lays out a smartphone over the bounding box whose top-left corner is at
 * (x, y): the case as the silhouette, with the screen, the speaker slit and the
 * home bar as detail. The screen is detail rather than a second silhouette so
 * that a fill set on the shape does not paint over the text sitting on it.
 * Shared by the object renderer (centered origin), the draw-drag preview that
 * reuses it, and the stencil icon.
 */
export const buildSmartphoneFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const centerX = x + width / 2;
	const caseCornerRadius = Math.min(width, height) * SMARTPHONE_CORNER_RATIO;
	return {
		body: [buildRoundedRectPath(x, y, width, height, caseCornerRadius)],
		detail: [
			buildRoundedRectPath(
				x + width * SMARTPHONE_SCREEN_X_RATIO,
				y + height * SMARTPHONE_SCREEN_Y_RATIO,
				width * SMARTPHONE_SCREEN_WIDTH_RATIO,
				height * SMARTPHONE_SCREEN_HEIGHT_RATIO,
				caseCornerRadius * SMARTPHONE_SCREEN_CORNER_RATIO,
			),
			buildHorizontalLinePath(
				y + height * SMARTPHONE_SPEAKER_Y_RATIO,
				centerX - width * SMARTPHONE_SPEAKER_HALF_WIDTH_RATIO,
				centerX + width * SMARTPHONE_SPEAKER_HALF_WIDTH_RATIO,
			),
			buildHorizontalLinePath(
				y + height * SMARTPHONE_HOME_BAR_Y_RATIO,
				centerX - width * SMARTPHONE_HOME_BAR_HALF_WIDTH_RATIO,
				centerX + width * SMARTPHONE_HOME_BAR_HALF_WIDTH_RATIO,
			),
		],
	};
};
