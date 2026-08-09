import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { calcRoundedRectOutline } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";

import { WINDOW_CORNER_RATIO } from "../shared/buildWindowFrame";

/**
 * Terminal window outline (centered): the frame's rounded box, shared in shape
 * with the browser. The title bar and its prompt are detail.
 */
export const terminalWindowOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) =>
	calcRoundedRectOutline(
		width,
		height,
		Math.min(width, height) * WINDOW_CORNER_RATIO,
	);
