import type { ObjectTextRegionCalculator } from "@workspace/canvas";
import type { Dimensions } from "@workspace/geometry";
import { calcInsetRect } from "@workspace/geometry";

import { WINDOW_TITLE_BAR_RATIO } from "./buildWindowFrame";

/** Gap between the frame (or the title bar) and the text, as a ratio of the box. */
const WINDOW_TEXT_PADDING_RATIO = 0.06;

/**
 * Places the text of a window shape in the content area under the title bar, so
 * a long line cannot run into the bar. Shared by the browser and the terminal,
 * which put their marks in the bar and leave the content area clear.
 */
export const calcWindowTextRegion: ObjectTextRegionCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: WINDOW_TITLE_BAR_RATIO + WINDOW_TEXT_PADDING_RATIO,
			right: WINDOW_TEXT_PADDING_RATIO,
			bottom: WINDOW_TEXT_PADDING_RATIO,
			left: WINDOW_TEXT_PADDING_RATIO,
		},
	);
