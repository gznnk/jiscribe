import { buildWindowFrame } from "../shared/buildWindowFrame";
import type { PictogramFigureBuilder } from "../shared/PictogramFigure";
import {
	buildChevronPath,
	buildHorizontalLinePath,
} from "../shared/pictogramPaths";

/** Prompt marks, as fractions of the title bar height. */
const TERMINAL_PROMPT_X_RATIO = 0.42;
const TERMINAL_CHEVRON_HEIGHT_RATIO = 0.4;
const TERMINAL_CHEVRON_WIDTH_RATIO = 0.24;
const TERMINAL_CARET_START_RATIO = 0.36;
const TERMINAL_CARET_WIDTH_RATIO = 0.44;

/**
 * Lays out a terminal window over the bounding box whose top-left corner is at
 * (x, y): the frame shared with the browser (buildWindowFrame), with a shell
 * prompt where the browser puts its buttons — the two read as one family and
 * both leave the content area clear for text. Shared by the object renderer
 * (centered origin) and the draw-drag preview that reuses it.
 */
export const buildTerminalWindowFigure: PictogramFigureBuilder = (
	x,
	y,
	width,
	height,
) => {
	const { outlinePath, titleBarPath, titleBarHeight, titleBarCenterY } =
		buildWindowFrame(x, y, width, height);
	const chevronTipX =
		x +
		titleBarHeight * (TERMINAL_PROMPT_X_RATIO + TERMINAL_CHEVRON_WIDTH_RATIO);
	const caretY =
		titleBarCenterY + (titleBarHeight * TERMINAL_CHEVRON_HEIGHT_RATIO) / 2;
	return {
		body: [outlinePath],
		detail: [
			titleBarPath,
			buildChevronPath(
				chevronTipX,
				titleBarCenterY,
				titleBarHeight * TERMINAL_CHEVRON_WIDTH_RATIO,
				titleBarHeight * TERMINAL_CHEVRON_HEIGHT_RATIO,
			),
			buildHorizontalLinePath(
				caretY,
				chevronTipX + titleBarHeight * TERMINAL_CARET_START_RATIO,
				chevronTipX +
					titleBarHeight *
						(TERMINAL_CARET_START_RATIO + TERMINAL_CARET_WIDTH_RATIO),
			),
		],
	};
};
