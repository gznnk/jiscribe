import { buildWindowFrame } from "../shared/buildWindowFrame";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import { buildEllipsePath } from "../shared/pictogramPaths";

/** Window buttons, as fractions of the title bar height. */
const BROWSER_BUTTON_COUNT = 3;
const BROWSER_BUTTON_RADIUS_RATIO = 0.15;
const BROWSER_BUTTON_FIRST_X_RATIO = 0.45;
const BROWSER_BUTTON_PITCH_RATIO = 0.42;

/**
 * Lays out a browser window over the bounding box whose top-left corner is at
 * (x, y): the frame shared with the terminal (buildWindowFrame), with the three
 * window buttons in the title bar. Shared by the object renderer (centered
 * origin) and the draw-drag preview that reuses it.
 */
export const buildBrowserWindowFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const { outlinePath, titleBarPath, titleBarHeight, titleBarCenterY } =
		buildWindowFrame(x, y, width, height);
	const buttonRadius = titleBarHeight * BROWSER_BUTTON_RADIUS_RATIO;
	const buttons = Array.from({ length: BROWSER_BUTTON_COUNT }, (_, index) =>
		buildEllipsePath(
			x +
				titleBarHeight *
					(BROWSER_BUTTON_FIRST_X_RATIO + index * BROWSER_BUTTON_PITCH_RATIO),
			titleBarCenterY,
			buttonRadius,
			buttonRadius,
		),
	);
	return { body: [outlinePath], detail: [titleBarPath, ...buttons] };
};
