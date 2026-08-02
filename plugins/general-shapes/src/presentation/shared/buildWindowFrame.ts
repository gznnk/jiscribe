import {
	buildHorizontalLinePath,
	buildRoundedRectPath,
} from "./pictogramPaths";

/**
 * Height of the title bar as a fraction of the window height. Shared by the
 * browser and the terminal — the two differ only in what sits in the bar, so a
 * change here must keep them looking like one family.
 */
export const WINDOW_TITLE_BAR_RATIO = 0.24;

/** Corner radius as a fraction of the shorter side. */
const WINDOW_CORNER_RATIO = 0.07;

export type WindowFrame = {
	/** The whole window silhouette: the only filled, hit-tested part. */
	outlinePath: string;
	/** The rule under the title bar. */
	titleBarPath: string;
	/** Title bar height in local px; callers place the bar's own marks against it. */
	titleBarHeight: number;
	/** Vertical center of the title bar in local coordinates. */
	titleBarCenterY: number;
};

/**
 * Lays out the window frame shared by the browser and the terminal over the
 * bounding box whose top-left corner is at (x, y).
 *
 * @param x Left edge in local coordinates.
 * @param y Top edge in local coordinates.
 * @param width Box width.
 * @param height Box height; the title bar takes WINDOW_TITLE_BAR_RATIO of it.
 */
export const buildWindowFrame = (
	x: number,
	y: number,
	width: number,
	height: number,
): WindowFrame => {
	const titleBarHeight = height * WINDOW_TITLE_BAR_RATIO;
	return {
		outlinePath: buildRoundedRectPath(
			x,
			y,
			width,
			height,
			Math.min(width, height) * WINDOW_CORNER_RATIO,
		),
		titleBarPath: buildHorizontalLinePath(y + titleBarHeight, x, x + width),
		titleBarHeight,
		titleBarCenterY: y + titleBarHeight / 2,
	};
};
