import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";

import { WINDOW_CORNER_RATIO } from "../shared/windowFrameRatios";

/**
 * Terminal window outline (centered): the frame's rounded box, shared in shape
 * with the browser. The title bar and its prompt are detail.
 */
export const terminalWindowOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * WINDOW_CORNER_RATIO,
	);
